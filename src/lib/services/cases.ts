import { container } from "@sapphire/framework";
import { EmbedBuilder, time, type Guild } from "discord.js";
import mongoose from "mongoose";
import { CaseModel, type CaseType } from "../db/models.js";
import { truncate } from "../embeds.js";
import { shouldEscalate, warningCutoff } from "../features/moderation.js";
import { sendModlog } from "./modlog.js";
import { nextSeq } from "./servers.js";
import { getFeatureSettings } from "./settings.js";

export interface CaseInput {
  guildId: string;
  userId: string;
  moderatorId: string;
  type: CaseType;
  reason: string;
}

export interface CaseRecord extends CaseInput {
  number: number;
  active: boolean;
  createdAt: Date;
}

export const CASE_LABEL: Record<CaseType, string> = {
  warn: "⚠️ Warning",
  automod: "🛡️ Auto-mod",
  timeout: "⏳ Timeout",
  kick: "👢 Kick",
  note: "📝 Note",
};

/** Types that count toward escalation. */
const STRIKES: CaseType[] = ["warn", "automod"];

export async function createCase(input: CaseInput): Promise<CaseRecord> {
  const number = await nextSeq(input.guildId, "case");
  const doc = await CaseModel.create({ ...input, reason: truncate(input.reason.trim(), 500), number });
  return { ...input, number, active: true, createdAt: doc.createdAt };
}

export async function getCase(guildId: string, number: number): Promise<CaseRecord | null> {
  return CaseModel.findOne({ guildId, number }).lean<CaseRecord>();
}

export async function listCases(guildId: string, userId: string, limit = 25): Promise<CaseRecord[]> {
  return CaseModel.find({ guildId, userId }).sort({ number: -1 }).limit(limit).lean<CaseRecord[]>();
}

export async function setCaseActive(guildId: string, number: number, active: boolean): Promise<boolean> {
  return (await CaseModel.updateOne({ guildId, number }, { $set: { active } })).matchedCount === 1;
}

export async function setCaseReason(guildId: string, number: number, reason: string): Promise<boolean> {
  return (await CaseModel.updateOne({ guildId, number }, { $set: { reason: truncate(reason.trim(), 500) } })).matchedCount === 1;
}

export async function activeStrikes(guildId: string, userId: string, expireDays: number): Promise<number> {
  const cutoff = warningCutoff(expireDays);
  return CaseModel.countDocuments({
    guildId,
    userId,
    active: true,
    type: mongoose.trusted({ $in: STRIKES }),
    ...(cutoff ? { createdAt: mongoose.trusted({ $gte: cutoff }) } : {}),
  });
}

export function caseEmbed(c: CaseRecord, title?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(c.active ? 0xe67e22 : 0x95a5a6)
    .setTitle(title ?? `Case #${c.number}: ${CASE_LABEL[c.type]}${c.active ? "" : " (pardoned)"}`)
    .addFields(
      { name: "Member", value: `<@${c.userId}> (${c.userId})`, inline: true },
      { name: "Moderator", value: `<@${c.moderatorId}>`, inline: true },
      { name: "When", value: time(c.createdAt, "f"), inline: true },
      { name: "Reason", value: c.reason || "*(none)*" },
    );
}

/**
 * Record a strike (manual warning or auto-mod action), DM the member if enabled, log it,
 * and escalate (timeout or kick) when they reach the configured number of active strikes.
 * Escalations are themselves recorded as cases. Returns the strike case and any escalation.
 */
export async function recordStrike(
  guild: Guild,
  input: Omit<CaseInput, "guildId">,
): Promise<{ strike: CaseRecord; strikes: number; escalation: CaseRecord | null }> {
  const cfg = (await getFeatureSettings(guild.id)).warnings;
  const strike = await createCase({ ...input, guildId: guild.id });
  await sendModlog(guild, "moderation", caseEmbed(strike));

  if (cfg.dmMembers && input.type === "warn") {
    await guild.client.users
      .send(input.userId, {
        content: `⚠️ You were warned in **${guild.name}**: ${strike.reason || "no reason given"}`,
        allowedMentions: { parse: [] },
      })
      .catch(() => undefined); // DMs closed
  }

  const strikes = await activeStrikes(guild.id, input.userId, cfg.expireDays);
  if (!shouldEscalate(strikes, cfg.escalateAt)) return { strike, strikes, escalation: null };

  const member = await guild.members.fetch(input.userId).catch(() => null);
  const reason = `Reached ${strikes} active warnings`;
  let done = false;
  if (member && cfg.escalateAction === "timeout" && member.moderatable) {
    done = await member.timeout(cfg.escalateMinutes * 60_000, reason).then(
      () => true,
      () => false,
    );
  } else if (member && cfg.escalateAction === "kick" && member.kickable) {
    done = await member.kick(reason).then(
      () => true,
      () => false,
    );
  }
  if (!done) {
    container.logger.debug(`Escalation skipped in ${guild.id}: member gone or above the bot`);
    return { strike, strikes, escalation: null };
  }
  const escalation = await createCase({
    guildId: guild.id,
    userId: input.userId,
    moderatorId: guild.client.user.id,
    type: cfg.escalateAction,
    reason: cfg.escalateAction === "timeout" ? `${reason} (${cfg.escalateMinutes} min)` : reason,
  });
  await sendModlog(guild, "moderation", caseEmbed(escalation));
  return { strike, strikes, escalation };
}

export async function deleteCasesForGuild(guildId: string): Promise<void> {
  await CaseModel.deleteMany({ guildId });
}
