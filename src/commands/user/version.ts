import { Command } from "@sapphire/framework";
import { registerGuildCommand } from "../../lib/commands.js";
import { VERSION } from "../../lib/constants.js";
import { brandEmbed } from "../../lib/embeds.js";

export class VersionCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Sends the version number of the bot", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.reply({
      embeds: [brandEmbed(interaction.client).setTitle("Version:").setDescription(`I am running version: ${VERSION}`)],
    });
  }
}
