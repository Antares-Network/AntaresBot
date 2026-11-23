import mongoose from "mongoose";
import { ServerModel } from "../db/models/index.js";
import { evaluateExpression } from "../features/mathExpr.js";
import { toCount } from "../util.js";

export type CountResult =
  | { kind: "ok"; next: number }
  | { kind: "same-user" }
  | { kind: "wrong"; expected: number };

/**
 * Pure counting rule (unchanged from v1): the same person may not count twice in a row,
 * and the message must be exactly the next whole number.
 */
export function evaluateCount(input: {
  content: string;
  authorId: string;
  current: number;
  lastUserId: string | null;
  /** Accept arithmetic like "12*2" (safe parser, no eval). */
  allowMath?: boolean;
}): CountResult {
  if (input.lastUserId !== null && input.lastUserId === input.authorId) return { kind: "same-user" };
  const text = input.content.trim();
  const expected = input.current + 1;
  const value = /^\d{1,15}$/.test(text) ? Number(text) : input.allowMath ? evaluateExpression(text) : null;
  if (value === expected) return { kind: "ok", next: expected };
  return { kind: "wrong", expected };
}

/** Would this message be an attempt at counting at all? (Chat in reset mode shouldn't reset.) */
export function looksLikeCount(content: string, allowMath: boolean): boolean {
  const text = content.trim();
  return /^\d{1,15}$/.test(text) || (allowMath && /\d/.test(text) && evaluateExpression(text) !== null);
}

export const MAX_SAVES = 3;
export const COUNTS_PER_SAVE = 100;

/**
 * Compare-and-set: only advance if nobody else changed the number first. Also keeps the
 * server high score, and earns a save every 100 counts (max 3).
 * Returns { committed, newHighScore, earnedSave }.
 */
export async function commitCount(guildId: string, current: number, next: number) {
  const before = await ServerModel.findOneAndUpdate(
    { _id: guildId, "counting.current": current },
    { $set: { "counting.current": next }, $max: { "counting.highScore": next } },
    { returnDocument: "before", projection: { counting: 1 } },
  ).lean();
  if (!before) return { committed: false, newHighScore: false, earnedSave: false };

  let earnedSave = false;
  if (next % COUNTS_PER_SAVE === 0) {
    // `$not: {$gte}` (unlike `$lt`) also matches a missing field, e.g. servers imported from v1.
    const r = await ServerModel.updateOne(
      { _id: guildId, "counting.saves": mongoose.trusted({ $not: { $gte: MAX_SAVES } }) },
      { $inc: { "counting.saves": 1 } },
    );
    earnedSave = r.modifiedCount === 1;
  }
  const previousHigh = toCount(before.counting?.highScore);
  return { committed: true, newHighScore: next > previousHigh, earnedSave };
}

/**
 * "Reset" mode mistake. Uses a save if one is available (count survives), otherwise
 * resets to 0. Conditional on the current number so racing mistakes act once.
 */
export async function failCount(guildId: string, current: number): Promise<"saved" | "reset" | "stale"> {
  const saved = await ServerModel.updateOne(
    { _id: guildId, "counting.current": current, "counting.saves": mongoose.trusted({ $gt: 0 }) },
    { $inc: { "counting.saves": -1 } },
  );
  if (saved.modifiedCount === 1) return "saved";
  const reset = await ServerModel.updateOne({ _id: guildId, "counting.current": current }, { $set: { "counting.current": 0 } });
  return reset.modifiedCount === 1 ? "reset" : "stale";
}

export async function getCountingState(guildId: string) {
  const d = await ServerModel.findById(guildId, { counting: 1 }).lean();
  return {
    current: toCount(d?.counting?.current),
    highScore: toCount(d?.counting?.highScore),
    saves: toCount(d?.counting?.saves),
  };
}

export async function setCount(guildId: string, value: number) {
  await ServerModel.updateOne({ _id: guildId }, { $set: { "counting.current": value } });
}

/**
 * Who counted last, per counting channel. Kept in memory only (v1 never stored it);
 * after a restart the listener falls back to reading the channel history, as v1 did.
 */
export const lastCounter = new Map<string, string>();

/** Serialises async work per key so messages in one counting channel are handled in order. */
export class KeyedQueue {
  private readonly tails = new Map<string, Promise<unknown>>();

  public run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const prev = this.tails.get(key) ?? Promise.resolve();
    const next = prev.then(task, task);
    const tail = next.catch(() => undefined);
    this.tails.set(key, tail);
    void tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key);
    });
    return next;
  }
}
