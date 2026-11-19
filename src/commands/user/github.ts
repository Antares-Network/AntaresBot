import { Command } from "@sapphire/framework";
import { registerGuildCommand } from "../../lib/commands.js";
import { GITHUB_URL, ICON_URL } from "../../lib/constants.js";
import { brandEmbed } from "../../lib/embeds.js";

export class GithubCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: "Sends an embed with a link to the github repo for the bot.",
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
          .setTitle("Github")
          .setURL(GITHUB_URL)
          .setThumbnail(ICON_URL)
          .setDescription(`Click here to go to the Antares Bot Github repo: \n ${GITHUB_URL}`),
      ],
    });
  }
}
