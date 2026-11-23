import { Command } from "@sapphire/framework";
import { z } from "zod";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { ICON_URL } from "../../lib/constants.js";
import { brandEmbed, truncate } from "../../lib/embeds.js";
import { fetchJson } from "../../lib/http.js";

const Apod = z.object({
  title: z.string(),
  date: z.string(),
  explanation: z.string(),
  media_type: z.string(),
  url: z.string().optional(),
  hdurl: z.string().optional(),
  thumbnail_url: z.string().optional(),
  copyright: z.string().optional(),
});

const isHttps = (u: string | undefined): u is string => !!u && z.url({ protocol: /^https$/ }).safeParse(u).success;

export class ApodCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: "Gets NASA's Astronomy Picture of the Day",
      preconditions: ["BotChannel"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const key = this.container.config.NASA_API_KEY;
    if (!key) {
      await interaction.reply({ content: "APOD isn't configured on this bot.", flags: ephemeral });
      return;
    }
    await interaction.deferReply();

    const url = new URL("https://api.nasa.gov/planetary/apod");
    url.searchParams.set("api_key", key);
    url.searchParams.set("thumbs", "true");
    const data = await fetchJson(url, Apod, { timeoutMs: 15_000 });

    const embed = brandEmbed(interaction.client)
      .setTitle(truncate(data.title, 256))
      .setDescription(truncate(data.explanation, 4000))
      .setFooter({
        text: data.copyright ? `${data.date} | Author: ${data.copyright.trim()}` : data.date,
        iconURL: ICON_URL,
      });

    // Some days are videos; Discord can't embed those as images, so show the thumbnail + link.
    if (data.media_type === "image" && isHttps(data.url)) {
      embed.setImage(data.url);
    } else {
      if (isHttps(data.thumbnail_url)) embed.setImage(data.thumbnail_url);
      if (isHttps(data.url)) embed.setURL(data.url);
    }
    await interaction.editReply({ embeds: [embed] });
  }
}
