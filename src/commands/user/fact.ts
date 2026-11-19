import { Command } from "@sapphire/framework";
import { z } from "zod";
import { registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed, truncate } from "../../lib/embeds.js";
import { fetchJson } from "../../lib/http.js";

const Fact = z.object({ text: z.string().min(1).max(2000) });

export class FactCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Sends a random fact", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const { text } = await fetchJson("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en", Fact);
    await interaction.editReply({
      embeds: [brandEmbed(interaction.client).setTitle("🤓 Random fact").setDescription(truncate(text, 2000))],
      allowedMentions: { parse: [] },
    });
  }
}
