import { Command } from "@sapphire/framework";
import { registerGuildCommand } from "../../lib/commands.js";
import { snipsEmbed } from "../../lib/embeds.js";

export class RCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: "r", description: "Does something. You'll find out.", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.reply({ embeds: [snipsEmbed()] });
  }
}
