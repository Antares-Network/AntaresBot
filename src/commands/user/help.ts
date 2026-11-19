import { Command } from "@sapphire/framework";
import { registerGuildCommand } from "../../lib/commands.js";
import { userHelp } from "../../lib/help.js";

export class HelpCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Shows the help embed" });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.reply(userHelp(interaction.client));
  }
}
