import { Command } from "@sapphire/framework";
import { PermissionFlagsBits } from "discord.js";
import { registerGuildCommand } from "../../lib/commands.js";
import { snipsEmbed } from "../../lib/embeds.js";

export class ArCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "ar",
      description: "Does nothing",
      requiredUserPermissions: [PermissionFlagsBits.ManageMessages],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) => b.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages));
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.reply({ embeds: [snipsEmbed()] });
  }
}
