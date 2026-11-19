import { Command } from "@sapphire/framework";
import { PermissionFlagsBits } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { banConfessor, unbanAllConfessors } from "../../lib/services/confessions.js";

export class ConfessModCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "confessmod",
      description: "Moderate anonymous confessions",
      requiredUserPermissions: [PermissionFlagsBits.ManageMessages],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand((s) =>
          s
            .setName("block")
            .setDescription("Stop the author of a confession from confessing again (they stay anonymous)")
            .addIntegerOption((o) => o.setName("number").setDescription("Confession #").setRequired(true).setMinValue(1)),
        )
        .addSubcommand((s) => s.setName("unblock-all").setDescription("Clear every confession block in this server")),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    if (interaction.options.getSubcommand() === "unblock-all") {
      const n = await unbanAllConfessors(interaction.guildId);
      await interaction.reply({ content: `✅ Cleared ${n} confession block(s).`, flags: ephemeral });
      return;
    }
    const number = interaction.options.getInteger("number", true);
    const r = await banConfessor(interaction.guildId, number);
    const text = {
      banned: `✅ The author of confession #${number} can no longer confess here. Nobody, including you, can see who they are.`,
      already: `The author of confession #${number} is already blocked.`,
      "not-found": `There's no confession #${number} in this server.`,
    }[r];
    await interaction.reply({ content: text, flags: ephemeral });
  }
}
