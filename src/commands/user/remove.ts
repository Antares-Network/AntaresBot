import { Command } from "@sapphire/framework";
import { ephemeral, registerAnywhereCommand } from "../../lib/commands.js";
import { deleteAllUserData } from "../../lib/services/privacy.js";

export class RemoveCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Delete all data the bot stores about you." });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerAnywhereCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const r = await deleteAllUserData(interaction.user.id);
    const deleted = r.profile || r.memberRecords > 0 || r.reminders > 0;
    await interaction.reply({
      content:
        (deleted
          ? "All data stored about you (your profile, stats, levels in every server, preferences and reminders) has been deleted. A new record is only created if you use the bot again."
          : "There is no data stored about you.") +
        "\n\nIf you are a server owner and would like your server's data deleted, remove the bot from your server: all server data is deleted when the bot leaves.",
      flags: ephemeral,
    });
  }
}
