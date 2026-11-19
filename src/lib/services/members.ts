import mongoose from "mongoose";
import { MemberModel, memberId } from "../db/models.js";
import { WriteBuffer } from "../db/writeBuffer.js";
import { levelFromXp, rollXp, XP_COOLDOWN_MS } from "../features/levels.js";
import { toCount } from "../util.js";

export interface XpAward {
  xp: number;
  level: number;
  leveledUp: boolean;
}

// In-memory per-member cooldown: XP at most once a minute, so spam can't farm levels.
const lastAward = new Map<string, number>();

/**
 * Give a member XP for a message if they're off cooldown. One atomic $inc that returns
 * the new total, so concurrent awards can't lose XP; the stored level is only bumped when
 * the new XP crosses a threshold. Returns null when on cooldown.
 */
export async function awardXp(guildId: string, userId: string, now = Date.now(), multiplier = 1): Promise<XpAward | null> {
  const key = memberId(guildId, userId);
  const last = lastAward.get(key);
  if (last !== undefined && now - last < XP_COOLDOWN_MS) return null;
  lastAward.set(key, now);
  if (lastAward.size > 50_000) {
    for (const [k, t] of lastAward) if (now - t >= XP_COOLDOWN_MS) lastAward.delete(k);
  }

  const doc = await MemberModel.findOneAndUpdate(
    { _id: key },
    { $inc: { xp: Math.max(1, Math.round(rollXp() * multiplier)) }, $setOnInsert: { guildId, userId } },
    { upsert: true, returnDocument: "after", projection: { xp: 1, level: 1 } },
  ).lean();
  const xp = toCount(doc?.xp);
  const { level } = levelFromXp(xp);
  const stored = toCount(doc?.level);
  if (level > stored) {
    // Conditional so two racing awards can't both announce the same level-up.
    const res = await MemberModel.updateOne({ _id: key, level: stored }, { $set: { level } });
    return { xp, level, leveledUp: res.modifiedCount === 1 };
  }
  return { xp, level, leveledUp: false };
}

/**
 * Admin XP adjustment (/xp give|take|set|reset). Clamped at 0; the stored level is set to
 * match the new total. Returns the old and new level so callers can apply role rewards.
 */
export async function adjustXp(
  guildId: string,
  userId: string,
  change: { add: number } | { set: number },
): Promise<{ xp: number; level: number; previousLevel: number }> {
  const key = memberId(guildId, userId);
  const before = await MemberModel.findById(key, { level: 1 }).lean();
  const update = "set" in change ? { $set: { xp: Math.max(0, Math.floor(change.set)) } } : { $inc: { xp: Math.trunc(change.add) } };
  let doc = await MemberModel.findOneAndUpdate(
    { _id: key },
    { ...update, $setOnInsert: { guildId, userId } },
    { upsert: true, returnDocument: "after", projection: { xp: 1 } },
  ).lean();
  if ((doc?.xp ?? 0) < 0) {
    doc =
      (await MemberModel.findOneAndUpdate(
        { _id: key, xp: mongoose.trusted({ $lt: 0 }) },
        { $set: { xp: 0 } },
        { returnDocument: "after", projection: { xp: 1 } },
      ).lean()) ?? doc;
  }
  const xp = Math.max(0, toCount(doc?.xp));
  const { level } = levelFromXp(xp);
  await MemberModel.updateOne({ _id: key }, { $set: { level } });
  return { xp, level, previousLevel: toCount(before?.level) };
}

export interface RankInfo {
  xp: number;
  level: number;
  into: number;
  needed: number;
  rank: number | null; // 1-based position in the server, null if no XP yet
  countingCorrect: number;
  countingMistakes: number;
}

export async function getRank(guildId: string, userId: string): Promise<RankInfo> {
  await countingStats.flush().catch(() => undefined);
  const doc = await MemberModel.findById(memberId(guildId, userId)).lean();
  const xp = toCount(doc?.xp);
  const lv = levelFromXp(xp);
  const rank = xp > 0 ? (await MemberModel.countDocuments({ guildId, xp: mongoose.trusted({ $gt: xp }) })) + 1 : null;
  return {
    xp,
    level: lv.level,
    into: lv.into,
    needed: lv.needed,
    rank,
    countingCorrect: toCount(doc?.countingCorrect),
    countingMistakes: toCount(doc?.countingMistakes),
  };
}

export type Board = "xp" | "counting";

export async function leaderboard(guildId: string, board: Board, limit = 10) {
  await countingStats.flush().catch(() => undefined);
  const field = board === "xp" ? "xp" : "countingCorrect";
  const rows = await MemberModel.find({ guildId, [field]: mongoose.trusted({ $gt: 0 }) }, { userId: 1, xp: 1, countingCorrect: 1 })
    .sort({ [field]: -1, userId: 1 })
    .limit(Math.min(Math.max(limit, 1), 25))
    .lean();
  return rows.map((r) => ({
    userId: r.userId,
    xp: toCount(r.xp),
    level: levelFromXp(toCount(r.xp)).level,
    countingCorrect: toCount(r.countingCorrect),
  }));
}

/** Highest level a user has reached in any server (for achievements). */
export async function highestLevel(userId: string): Promise<number> {
  const top = await MemberModel.findOne({ userId }, { xp: 1 }).sort({ xp: -1 }).lean();
  return levelFromXp(toCount(top?.xp)).level;
}

// Per-server counting stats are buffered like the global user stats.
const countingStats = new WriteBuffer("member-counting", MemberModel as never, { upsert: true });

export function recordMemberCount(guildId: string, userId: string, correct: boolean): void {
  countingStats.add(memberId(guildId, userId), {
    inc: { [correct ? "countingCorrect" : "countingMistakes"]: 1 },
    setOnInsert: { guildId, userId },
  });
}

export function flushMemberStats(): Promise<number> {
  return countingStats.flush();
}

/** /remove: every per-server record for this user. */
export async function deleteMemberDataForUser(userId: string): Promise<number> {
  // Match on the key, not on existing documents: a first-ever counting stat may still be
  // buffered for a member record that doesn't exist yet, and must not be written after /remove.
  const mine = (key: string) => key.endsWith(`:${userId}`);
  await countingStats.forgetMatching(mine);
  for (const key of [...lastAward.keys()]) if (mine(key)) lastAward.delete(key);
  const res = await MemberModel.deleteMany({ userId });
  return res.deletedCount;
}

/** Bot removed from a server: drop every member record for it. */
export async function deleteMemberDataForGuild(guildId: string): Promise<void> {
  const inGuild = (key: string) => key.startsWith(`${guildId}:`);
  await countingStats.forgetMatching(inGuild);
  for (const key of [...lastAward.keys()]) if (inGuild(key)) lastAward.delete(key);
  await MemberModel.deleteMany({ guildId });
}
