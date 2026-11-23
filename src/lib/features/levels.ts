import { randomInt } from "node:crypto";

/** XP needed to go from `level` to `level + 1` (the common 5l² + 50l + 100 curve). */
export const xpForNext = (level: number) => 5 * level * level + 50 * level + 100;

/** Total XP required to reach `level` from 0. */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 0; l < level; l++) total += xpForNext(l);
  return total;
}

export function levelFromXp(xp: number): { level: number; into: number; needed: number } {
  let level = 0;
  let remaining = Math.max(0, Math.floor(xp));
  while (remaining >= xpForNext(level) && level < 1000) {
    remaining -= xpForNext(level);
    level++;
  }
  return { level, into: remaining, needed: xpForNext(level) };
}

/** XP per eligible message (15–25), at most once per COOLDOWN per member per server. */
export const XP_COOLDOWN_MS = 60_000;
export const rollXp = () => randomInt(15, 26);

/** Messages too short to be real conversation earn nothing (stops "a" spam farming). */
export const earnsXp = (content: string) => content.replace(/\s+/g, "").length >= 3;

export interface XpControls {
  noXpChannelIds: readonly string[];
  noXpRoleIds: readonly string[];
  roleMultipliers: readonly { roleId: string; multiplier: number }[];
  channelMultipliers: readonly { channelId: string; multiplier: number }[];
}

export interface XpContext {
  channelId: string;
  /** Thread parent channel, if the message is in a thread. */
  parentId: string | null;
  /** Category of the channel (or of the thread's parent). */
  categoryId: string | null;
  roleIds: readonly string[];
}

/** Max combined multiplier, so stacked boosts can't make levels meaningless. */
export const MAX_XP_MULTIPLIER = 10;

/**
 * XP multiplier for a message: 0 when the channel (or its parent/category) or one of the
 * member's roles is excluded; otherwise the most specific channel multiplier (channel,
 * then thread parent, then category) times the member's highest role multiplier.
 */
export function xpMultiplierFor(cfg: XpControls, ctx: XpContext): number {
  const places = [ctx.channelId, ctx.parentId, ctx.categoryId].filter((x): x is string => x !== null);
  if (places.some((p) => cfg.noXpChannelIds.includes(p))) return 0;
  if (ctx.roleIds.some((r) => cfg.noXpRoleIds.includes(r))) return 0;
  let channel = 1;
  for (const p of places) {
    const m = cfg.channelMultipliers.find((c) => c.channelId === p);
    if (m) {
      channel = m.multiplier;
      break;
    }
  }
  // The member's best matching role multiplier (which may be a penalty below 1), else 1.
  const mine = cfg.roleMultipliers.filter((r) => ctx.roleIds.includes(r.roleId)).map((r) => r.multiplier);
  const role = mine.length ? Math.max(...mine) : 1;
  return Math.min(MAX_XP_MULTIPLIER, channel * role);
}
