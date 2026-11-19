import { randomInt } from "node:crypto";
import { Command } from "@sapphire/framework";
import { z } from "zod";
import { registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { fetchJson } from "../../lib/http.js";

const Comic = z.object({ num: z.number().int().positive(), img: z.url({ protocol: /^https$/ }), safe_title: z.string() });

let latest = { num: 0, fetchedAt: 0 };

/** v1 hard-coded the newest comic number (and had to be edited by hand). Look it up, cached 6h. */
async function latestComicNumber(): Promise<number> {
  if (Date.now() - latest.fetchedAt > 6 * 3_600_000) {
    const { num } = await fetchJson("https://xkcd.com/info.0.json", Comic);
    latest = { num, fetchedAt: Date.now() };
  }
  return latest.num;
}

export class ComicCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Gets a comic from xkcd", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    let n = randomInt(1, (await latestComicNumber()) + 1);
    if (n === 404) n = 405; // xkcd #404 intentionally doesn't exist
    const comic = await fetchJson(`https://xkcd.com/${n}/info.0.json`, Comic);
    await interaction.editReply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle(`Random XKCD Comic: #${comic.num} ${comic.safe_title}`.slice(0, 256))
          .setURL(`https://xkcd.com/${comic.num}/`)
          .setImage(comic.img),
      ],
    });
  }
}
