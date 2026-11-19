import { Command } from "@sapphire/framework";
import { ActivityType } from "discord.js";
import { ephemeral, registerOwnerCommand } from "../../lib/commands.js";

// v1 name was "status", which collided with the user-facing /status command.
export class SetStatusCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "setstatus",
      description: "Updates the status for the bot (until the next rotation)",
      preconditions: ["OwnerOnly"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerOwnerCommand(this, registry, (b) =>
      b.addStringOption((o) => o.setName("status").setDescription("Status text").setRequired(true).setMaxLength(128)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const text = interaction.options.getString("status", true);
    interaction.client.user.setPresence({ status: "online", activities: [{ name: text, type: ActivityType.Playing }] });
    await interaction.reply({ content: "Status updated successfully", flags: ephemeral });
  }
}
