import { Command } from "@sapphire/framework";
import { PermissionFlagsBits } from "discord.js";
import { registerGuildCommand } from "../../lib/commands.js";
import { adminHelp } from "../../lib/help.js";

export class AdminHelpCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "adminhelp",
      description: "Shows the bot's admin help embed",
      requiredUserPermissions: [PermissionFlagsBits.ManageMessages],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) => b.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages));
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.reply(adminHelp(interaction.client));
  }
}
