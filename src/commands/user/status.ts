import { Command } from "@sapphire/framework";
import { registerGuildCommand } from "../../lib/commands.js";
import { ICON_URL, STATUS_PAGE_URL } from "../../lib/constants.js";
import { brandEmbed } from "../../lib/embeds.js";

export class StatusCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: "Sends an embed with a link to the status page for the entire Antares Network.",
      preconditions: ["BotChannel"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.reply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("Status Page")
          .setURL(STATUS_PAGE_URL)
          .setThumbnail(ICON_URL)
          .setDescription(`Click here to go to the Antares Network Status page: \n ${STATUS_PAGE_URL}`),
      ],
    });
  }
}
