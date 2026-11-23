import { Command } from "@sapphire/framework";
import { escapeMarkdown, PermissionFlagsBits } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed, truncate } from "../../lib/embeds.js";
import { MAX_RULES_PER_SERVER, type MatchMode } from "../../lib/features/autoreply.js";
import { addRule, getRules, removeRule } from "../../lib/services/autoreplies.js";
import { ensureServer } from "../../lib/services/servers.js";

export class AutoReplyCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: "Custom 'when someone says X, reply Y' rules",
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((s) =>
          s
            .setName("add")
            .setDescription("Add or update an auto-reply")
            .addStringOption((o) => o.setName("trigger").setDescription("Text to watch for").setRequired(true).setMinLength(2).setMaxLength(100))
            .addStringOption((o) => o.setName("response").setDescription("What the bot replies (no pings)").setRequired(true).setMaxLength(500))
            .addStringOption((o) =>
              o
                .setName("match")
                .setDescription("How the trigger matches (default: word)")
                .addChoices(
                  { name: "whole word(s) anywhere", value: "word" },
                  { name: "anywhere, even inside words", value: "contains" },
                  { name: "the entire message", value: "exact" },
                ),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("remove")
            .setDescription("Remove an auto-reply")
            .addStringOption((o) => o.setName("trigger").setDescription("Trigger text").setRequired(true).setMaxLength(100)),
        )
        .addSubcommand((s) => s.setName("list").setDescription("List this server's auto-replies")),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    await ensureServer(interaction.guild);
    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
      const rules = await getRules(interaction.guildId);
      const lines = rules.map((r) => `\`${escapeMarkdown(r.trigger)}\` (${r.match}) → ${escapeMarkdown(truncate(r.response, 80))}`);
      await interaction.reply({
        embeds: [
          brandEmbed(interaction.client)
            .setTitle(`Auto-replies (${rules.length}/${MAX_RULES_PER_SERVER})`)
            .setDescription(lines.join("\n") || "None yet. Add one with `/autoreply add`."),
        ],
        flags: ephemeral,
      });
      return;
    }

    const trigger = interaction.options.getString("trigger", true);
    if (sub === "remove") {
      const removed = await removeRule(interaction.guildId, trigger);
      await interaction.reply({ content: removed ? "✅ Removed." : "No auto-reply with that trigger.", flags: ephemeral });
      return;
    }

    const response = interaction.options.getString("response", true);
    const match = (interaction.options.getString("match") ?? "word") as MatchMode;
    const result = await addRule(interaction.guildId, interaction.user.id, trigger, match, response);
    await interaction.reply({
      content:
        result === "limit"
          ? `❌ This server already has ${MAX_RULES_PER_SERVER} auto-replies. Remove one first.`
          : `✅ Auto-reply ${result}. The bot replies at most once every 10 seconds per channel, and replies never ping anyone.`,
      flags: ephemeral,
    });
  }
}
