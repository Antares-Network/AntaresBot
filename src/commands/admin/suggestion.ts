import { Command } from "@sapphire/framework";
import { ChannelType, EmbedBuilder, PermissionFlagsBits, type SlashCommandSubcommandBuilder } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { truncate } from "../../lib/embeds.js";
import type { SuggestionStatus } from "../../lib/db/models/index.js";
import { setSuggestionStatus, STATUS_STYLE, voteRow } from "../../lib/services/suggestions.js";
import { ensureServer } from "../../lib/services/servers.js";
import { updateSettings } from "../../lib/services/settings.js";

export class SuggestionCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "suggestion",
      description: "Review suggestions and set up the suggestions channel",
      requiredUserPermissions: [PermissionFlagsBits.ManageMessages],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    const review = (name: string, description: string) => (s: SlashCommandSubcommandBuilder) =>
      s
        .setName(name)
        .setDescription(description)
        .addIntegerOption((o) => o.setName("number").setDescription("Suggestion #").setRequired(true).setMinValue(1))
        .addStringOption((o) => o.setName("note").setDescription("Shown on the suggestion").setMaxLength(500));
    registerGuildCommand(this, registry, (b) =>
      b
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(review("approve", "Approve a suggestion"))
        .addSubcommand(review("deny", "Deny a suggestion"))
        .addSubcommand(review("consider", "Mark a suggestion as under consideration"))
        .addSubcommand(review("reopen", "Reopen a suggestion for votes"))
        .addSubcommand((s) =>
          s
            .setName("setup")
            .setDescription("Set the suggestions channel (needs Manage Server)")
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("Channel")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
            )
            .addBooleanOption((o) => o.setName("threads").setDescription("Open a discussion thread on each suggestion (default on)")),
        )
        .addSubcommand((s) => s.setName("disable").setDescription("Turn off /suggest (needs Manage Server)")),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const sub = interaction.options.getSubcommand();
    const g = interaction.guildId;
    const reply = (content: string) => interaction.reply({ content, flags: ephemeral, allowedMentions: { parse: [] } });

    if (sub === "setup" || sub === "disable") {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        await reply("❌ You need **Manage Server** for that.");
        return;
      }
      await ensureServer(interaction.guild);
      if (sub === "disable") {
        await updateSettings(g, "suggestions", { channelId: null });
        {
          await reply("✅ `/suggest` is off.");
          return;
        }
      }
      const channel = interaction.options.getChannel("channel", true);
      const threads = interaction.options.getBoolean("threads");
      await updateSettings(g, "suggestions", { channelId: channel.id, ...(threads !== null ? { threads } : {}) });
      {
        await reply(`✅ Suggestions will be posted in <#${channel.id}>. Members use \`/suggest\`.`);
        return;
      }
    }

    const number = interaction.options.getInteger("number", true);
    const status =
      ({ approve: "approved", deny: "denied", consider: "considered", reopen: "open" } as Record<string, SuggestionStatus>)[sub] ?? "open";
    const s = await setSuggestionStatus(g, number, status);
    if (!s) {
      await reply(`There's no suggestion #${number} here.`);
      return;
    }

    const note = interaction.options.getString("note");
    const channel = interaction.guild.channels.cache.get(s.channelId);
    const msg = s.messageId && channel?.isTextBased() ? await channel.messages.fetch(s.messageId).catch(() => null) : null;
    const original = msg?.embeds[0];
    if (msg && original) {
      const st = STATUS_STYLE[status];
      const embed = EmbedBuilder.from(original)
        .setColor(st.color)
        .setFields(
          { name: "Status", value: truncate(`${st.label}${note ? `\n${note}` : ""}\n*by <@${interaction.user.id}>*`, 1024) },
          ...(s.authorId ? [{ name: "Suggested by", value: `<@${s.authorId}>`, inline: true }] : []),
        );
      const closed = status === "approved" || status === "denied";
      await msg.edit({
        embeds: [embed],
        components: [voteRow(number, s.up.length, s.down.length, closed)],
        allowedMentions: { parse: [] },
      });
      if (msg.thread && !msg.thread.archived) {
        await msg.thread
          .send({
            content: `${st.label} by <@${interaction.user.id}>${note ? `: ${note}` : ""}`,
            allowedMentions: { users: s.authorId ? [s.authorId] : [] },
          })
          .catch(() => undefined);
      }
    }
    await reply(`✅ Suggestion #${number} is now **${status}**${msg ? "" : " (its message was deleted, so only the record changed)"}.`);
  }
}
