import { setTimeout as wait } from "node:timers/promises";
import { Events, Listener } from "@sapphire/framework";
import { EmbedBuilder, PermissionFlagsBits, type Message } from "discord.js";
import { BRAND_COLOR, SLASH_FAQ_URL } from "../lib/constants.js";
import { truncate } from "../lib/embeds.js";
import { detectViolation, DuplicateTracker, VIOLATION_TEXT, type Violation } from "../lib/features/automod.js";
import { findReply } from "../lib/features/autoreply.js";
import { formatChatLine } from "../lib/features/chatLog.js";
import { earnsXp } from "../lib/features/levels.js";
import { getRules, takeReplyCooldown } from "../lib/services/autoreplies.js";
import {
  commitCount,
  evaluateCount,
  failCount,
  getCountingState,
  KeyedQueue,
  lastCounter,
  looksLikeCount,
  MAX_SAVES,
} from "../lib/services/counting.js";
import { activeGame } from "../lib/services/games.js";
import { gate } from "../lib/services/gate.js";
import { announceLevelUp, applyRoleRewards } from "../lib/services/levelUp.js";
import { previewEmbeds } from "../lib/services/linkPreviews.js";
import { recordStrike } from "../lib/services/cases.js";
import { xpMultiplierFor } from "../lib/features/levels.js";
import { awardXp, recordMemberCount } from "../lib/services/members.js";
import { sendModlog } from "../lib/services/modlog.js";
import { countMessage, getCountingChannelId, getSettings } from "../lib/services/servers.js";
import { getFeatureSettings, type ServerSettings } from "../lib/services/settings.js";
import { recordCount } from "../lib/services/users.js";

const PREVIEW_COOLDOWN_MS = 5_000;

/**
 * Privacy: message text is read only in memory, for the features below, and is never
 * stored. It is only printed to the console when CHAT_LOG=true, which is meant for
 * development and is off by default (v1 always printed every message).
 */
export class MessageCreateListener extends Listener<typeof Events.MessageCreate> {
  private readonly countingQueue = new KeyedQueue();
  private readonly duplicates = new DuplicateTracker();
  private readonly previewCooldown = new Map<string, number>();
  /** Channels that already announced "new high score" during the current run. */
  private readonly recordAnnounced = new Set<string>();
  private mentionPattern: RegExp | null = null;

  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.MessageCreate });
  }

  public override async run(message: Message) {
    if (this.container.config.CHAT_LOG) this.logChat(message);
    if (message.author.bot || message.webhookId || !message.inGuild()) return;
    if (await gate.isIgnored(message.guildId)) return;
    if (await gate.isBanned({ guildId: message.guildId, ownerId: message.guild.ownerId, userId: message.author.id })) return;

    countMessage(message.guildId);
    const settings = await getFeatureSettings(message.guildId);

    // 1. Auto-moderation runs first: a removed message gets no other processing.
    if (await this.step("automod", () => this.automod(message, settings))) return;

    // 2. A game running in this channel treats matching messages as moves.
    const game = activeGame(message.channelId);
    if (game && (await this.step("game", () => game.handle(message)))) return;

    // 3. Bare @mention of the bot.
    if (this.isBareMention(message)) {
      await message.reply(
        "All of my commands are slash commands — type `/` to see them, or run `/help`.\n" +
          `Learn how slash commands work here: ${SLASH_FAQ_URL}`,
      );
      return;
    }

    // 4. Counting channel: nothing else happens there.
    if ((await getCountingChannelId(message.guildId)) === message.channelId) {
      await this.countingQueue.run(message.channelId, () => this.handleCount(message, settings));
      return;
    }

    await this.step("autoreply", () => this.autoReply(message));
    await this.step("previews", () => this.linkPreviews(message, settings));
    await this.step("xp", () => this.xp(message, settings));
  }

  /** CHAT_LOG: print the message (bots included) before any filtering, so everything seen is logged. */
  private logChat(message: Message) {
    if (!message.inGuild()) return;
    this.container.logger.info(
      formatChatLine({
        guild: message.guild.name,
        channel: message.channel.name,
        author: message.author.tag,
        authorId: message.author.id,
        bot: message.author.bot,
        content: message.content,
        attachments: message.attachments.size,
      }),
    );
  }

  /** Run one pipeline stage; a failure is logged and never blocks the other stages. */
  private async step(name: string, fn: () => Promise<unknown>): Promise<boolean> {
    try {
      return (await fn()) === true;
    } catch (err) {
      this.container.logger.warn(`messageCreate stage "${name}" failed:`, err);
      return false;
    }
  }

  private isBareMention(message: Message): boolean {
    this.mentionPattern ??= new RegExp(`^<@!?${message.client.user.id}>$`);
    return this.mentionPattern.test(message.content.trim());
  }

  // -------------------------------------------------------------------------
  // Auto-moderation
  // -------------------------------------------------------------------------
  private async automod(message: Message<true>, settings: ServerSettings): Promise<boolean> {
    const cfg = settings.automod;
    if (!cfg.enabled || cfg.exemptChannelIds.includes(message.channelId)) return false;
    const member = message.member;
    if (!member) return false;
    // Never moderate the owner, moderators, or exempt roles.
    if (
      member.id === message.guild.ownerId ||
      member.permissions.has(PermissionFlagsBits.ManageMessages) ||
      cfg.exemptRoleIds.some((r) => member.roles.cache.has(r))
    ) {
      return false;
    }

    const mentionCount = new Set([...message.mentions.users.keys(), ...message.mentions.roles.keys()]).size +
      (message.mentions.everyone ? 1 : 0);
    const isRepeat = cfg.duplicates && this.duplicates.check(`${message.guildId}:${member.id}`, message.content);
    const violation = detectViolation(message.content, mentionCount, {
      invites: cfg.invites,
      massMentions: cfg.massMentions,
      caps: cfg.caps,
      isRepeat,
    });
    if (!violation) return false;

    const me = message.guild.members.me;
    if (me?.permissionsIn(message.channel).has(PermissionFlagsBits.ManageMessages)) {
      await message.delete().catch(() => undefined);
    }
    let timedOut = false;
    if (cfg.action === "timeout" && member.moderatable) {
      timedOut = await member
        .timeout(cfg.timeoutMinutes * 60_000, `Auto-mod: ${violation}`)
        .then(() => true, () => false);
    }
    if (cfg.action !== "delete") {
      const notice = await message.channel
        .send({
          content: `<@${member.id}> ${VIOLATION_TEXT[violation]}${timedOut ? ` You've been timed out for ${cfg.timeoutMinutes} minute(s).` : ""}`,
          allowedMentions: { users: [member.id] },
        })
        .catch(() => null);
      if (notice) void wait(8000).then(() => notice.delete().catch(() => undefined));
    }
    await sendModlog(message.guild, "automod", this.automodEmbed(message, violation, cfg.action, timedOut));
    // "warn"/"timeout" actions are strikes: they're numbered cases and count toward escalation.
    if (cfg.action !== "delete") {
      await recordStrike(message.guild, {
        userId: member.id,
        moderatorId: message.client.user.id,
        type: "automod",
        reason: `${violation}${timedOut ? ` (timed out ${cfg.timeoutMinutes} min)` : ""}`,
      }).catch((err: unknown) => {
        this.container.logger.warn("Could not record auto-mod case:", err);
      });
    }
    return true;
  }

  private automodEmbed(message: Message<true>, violation: Violation, action: string, timedOut: boolean) {
    return new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle(`Auto-mod: ${violation}`)
      .setDescription(truncate(message.content || "*(no text)*", 1000))
      .addFields(
        { name: "Member", value: `<@${message.author.id}> (${message.author.id})`, inline: true },
        { name: "Channel", value: `<#${message.channelId}>`, inline: true },
        { name: "Action", value: timedOut ? `${action} (timed out)` : action, inline: true },
      );
  }

  // -------------------------------------------------------------------------
  // Counting
  // -------------------------------------------------------------------------
  /** Who made the last ACCEPTED count (memory, else recovered from channel history). */
  private async previousCounter(message: Message<true>, current: number): Promise<string | null> {
    const known = lastCounter.get(message.channelId);
    if (known) return known;
    if (current === 0) return null;
    const recent = await message.channel.messages.fetch({ before: message.id, limit: 25 }).catch(() => null);
    const accepted = recent?.find((m) => !m.author.bot && m.content.trim() === String(current));
    if (accepted) lastCounter.set(message.channelId, accepted.author.id);
    return accepted?.author.id ?? null;
  }

  private async handleCount(message: Message<true>, settings: ServerSettings) {
    const state = await getSettings(message.guildId);
    if (!state || state.countingChannelId !== message.channelId) return;
    const { mode, allowMath } = settings.counting;

    // In reset mode, ordinary chat in the counting channel is left alone.
    if (mode === "reset" && !looksLikeCount(message.content, allowMath)) return;

    const result = evaluateCount({
      content: message.content,
      authorId: message.author.id,
      current: state.countingCurrent,
      lastUserId: await this.previousCounter(message, state.countingCurrent),
      allowMath,
    });

    if (result.kind === "ok") {
      const r = await commitCount(message.guildId, state.countingCurrent, result.next);
      if (!r.committed) return this.rejectClassic(message, "That is not the correct number. Someone else counted first.");
      lastCounter.set(message.channelId, message.author.id);
      recordCount(message.author, true);
      recordMemberCount(message.guildId, message.author.id, true);
      if (r.earnedSave) await message.react("🛟").catch(() => undefined);
      if (r.newHighScore && !this.recordAnnounced.has(message.channelId) && result.next > 1) {
        this.recordAnnounced.add(message.channelId);
        await message.react("🏆").catch(() => undefined);
      }
      return;
    }

    recordCount(message.author, false);
    recordMemberCount(message.guildId, message.author.id, false);
    const why =
      result.kind === "same-user"
        ? "You can't count twice in a row!"
        : `That's not right, the next number was **${result.expected}**.`;

    if (mode === "classic") {
      return this.rejectClassic(
        message,
        result.kind === "same-user"
          ? "Wait your turn! Please wait for someone else to send the next number."
          : `That is not the correct number. You should type *${result.expected}*`,
      );
    }

    // Reset mode: use a save, or start over.
    const outcome = await failCount(message.guildId, state.countingCurrent);
    if (outcome === "saved") {
      const { saves } = await getCountingState(message.guildId);
      await message.react("🛟").catch(() => undefined);
      await message.channel.send({
        content:
          `🛟 ${why} A save was used, so the count lives on! The next number is **${state.countingCurrent + 1}**. ` +
          `Saves left: **${saves}/${MAX_SAVES}** (one is earned every 100 counts).`,
        allowedMentions: { parse: [] },
      });
    } else if (outcome === "reset") {
      lastCounter.delete(message.channelId);
      this.recordAnnounced.delete(message.channelId);
      await message.react("❌").catch(() => undefined);
      await message.channel.send({
        content: `💥 <@${message.author.id}> ruined it at **${state.countingCurrent}**! ${why} Start again from **1**.`,
        allowedMentions: { parse: [] },
      });
    }
  }

  private async rejectClassic(message: Message<true>, text: string) {
    await message.delete().catch(() => undefined);
    const notice = await message.channel.send({ content: text, allowedMentions: { parse: [] } }).catch(() => null);
    if (notice) void wait(5000).then(() => notice.delete().catch(() => undefined));
  }

  // -------------------------------------------------------------------------
  // Auto-replies, link previews, XP
  // -------------------------------------------------------------------------
  private async autoReply(message: Message<true>) {
    const rules = await getRules(message.guildId);
    if (rules.length === 0) return;
    const rule = findReply(message.content, rules);
    if (!rule || !takeReplyCooldown(message.channelId)) return;
    await message.channel.send({ content: rule.response, allowedMentions: { parse: [] } });
  }

  private async linkPreviews(message: Message<true>, settings: ServerSettings) {
    if (!settings.linkPreviews.enabled || !/https?:\/\//i.test(message.content)) return;
    const last = this.previewCooldown.get(message.channelId) ?? 0;
    if (Date.now() - last < PREVIEW_COOLDOWN_MS) return;
    const embeds = await previewEmbeds(message.client, message.content);
    if (embeds.length === 0) return;
    this.previewCooldown.set(message.channelId, Date.now());
    await message.reply({ embeds: embeds.map((e) => e.setColor(BRAND_COLOR)), allowedMentions: { parse: [], repliedUser: false } });
  }

  private async xp(message: Message<true>, settings: ServerSettings) {
    const cfg = settings.levels;
    if (!cfg.enabled || !earnsXp(message.content) || !message.member) return;
    const channel = message.channel;
    const multiplier = xpMultiplierFor(cfg, {
      channelId: channel.id,
      parentId: channel.isThread() ? channel.parentId : null,
      categoryId: channel.isThread() ? (channel.parent?.parentId ?? null) : "parentId" in channel ? channel.parentId : null,
      roleIds: [...message.member.roles.cache.keys()],
    });
    if (multiplier === 0) return; // no-XP channel or role
    const award = await awardXp(message.guildId, message.author.id, Date.now(), multiplier);
    if (!award?.leveledUp) return;
    const rewards = await applyRoleRewards(message.member, award.level, cfg);
    await announceLevelUp(message, award.level, cfg, rewards);
  }
}
