import { ConfessionModel } from "../db/models.js";
import { confessorHash } from "../features/confessionHash.js";
import { getFeatureSettings, updateSettings } from "./settings.js";

export const CONFESSION_COOLDOWN_MS = 5 * 60_000;

// Cooldown keyed by the hash, never the user ID, so even memory holds no link to a confession.
const lastConfession = new Map<string, number>();

export type ConfessResult =
  | { ok: true; number: number }
  | { ok: false; reason: "disabled" | "banned" | "cooldown"; retryAfterMs?: number };

/** Reserve the next confession number for a server (atomic, gap-tolerant). */
async function nextNumber(guildId: string): Promise<number> {
  const last = await ConfessionModel.findOne({ guildId }, { number: 1 }).sort({ number: -1 }).lean();
  return (last?.number ?? 0) + 1;
}

/**
 * Check eligibility and reserve a confession record. The caller posts the message, then
 * calls attachMessage. Retries on the (rare) number collision between concurrent confessions.
 */
export async function beginConfession(secret: string, guildId: string, userId: string, now = Date.now()): Promise<ConfessResult> {
  const settings = await getFeatureSettings(guildId);
  if (!settings.confessions.channelId) return { ok: false, reason: "disabled" };
  const hash = confessorHash(secret, guildId, userId);
  if (settings.confessions.bannedHashes.includes(hash)) return { ok: false, reason: "banned" };
  const last = lastConfession.get(hash);
  if (last !== undefined && now - last < CONFESSION_COOLDOWN_MS) {
    return { ok: false, reason: "cooldown", retryAfterMs: CONFESSION_COOLDOWN_MS - (now - last) };
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const number = await nextNumber(guildId);
    try {
      await ConfessionModel.create({ guildId, number, authorHash: hash });
      lastConfession.set(hash, now);
      return { ok: true, number };
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err; // duplicate number: retry
    }
  }
  throw new Error("could not allocate a confession number");
}

export async function attachMessage(guildId: string, number: number, messageId: string | null): Promise<void> {
  if (messageId) await ConfessionModel.updateOne({ guildId, number }, { $set: { messageId } });
  else await ConfessionModel.deleteOne({ guildId, number }); // posting failed: release it
}

/** Block the (unknown) author of confession #n from confessing again in this server. */
export async function banConfessor(guildId: string, number: number): Promise<"banned" | "already" | "not-found"> {
  const c = await ConfessionModel.findOne({ guildId, number }, { authorHash: 1 }).lean();
  if (!c) return "not-found";
  const result: { already: boolean } = { already: false };
  // Functional update: computed from the stored list, never a cached copy.
  await updateSettings(guildId, "confessions", (cur) => {
    result.already = cur.bannedHashes.includes(c.authorHash);
    return result.already ? {} : { bannedHashes: [...cur.bannedHashes, c.authorHash].slice(-1000) };
  });
  return result.already ? "already" : "banned";
}

export async function unbanAllConfessors(guildId: string): Promise<number> {
  let n = 0;
  await updateSettings(guildId, "confessions", (cur) => {
    n = cur.bannedHashes.length;
    return { bannedHashes: [] };
  });
  return n;
}

export async function deleteConfessionsForGuild(guildId: string): Promise<void> {
  await ConfessionModel.deleteMany({ guildId });
}
