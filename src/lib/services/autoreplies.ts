import { AutoReplyModel } from "../db/models/index.js";
import { MAX_RULES_PER_SERVER, normaliseTrigger, type AutoReplyRule, type MatchMode } from "../features/autoreply.js";

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { rules: AutoReplyRule[]; at: number }>();
const generation = new Map<string, number>();

function invalidate(guildId: string) {
  cache.delete(guildId);
  generation.set(guildId, (generation.get(guildId) ?? 0) + 1);
}

/** Rules for a server, cached (read on every message in servers that use them). */
export async function getRules(guildId: string): Promise<AutoReplyRule[]> {
  const hit = cache.get(guildId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rules;
  const gen = generation.get(guildId) ?? 0;
  const docs = await AutoReplyModel.find({ guildId }, { trigger: 1, match: 1, response: 1 })
    .limit(MAX_RULES_PER_SERVER)
    .lean();
  const rules = docs.map((d) => ({ trigger: d.trigger, match: d.match, response: d.response }));
  if ((generation.get(guildId) ?? 0) === gen) cache.set(guildId, { rules, at: Date.now() });
  return rules;
}

export type AddResult = "added" | "updated" | "limit";

export async function addRule(
  guildId: string,
  createdBy: string,
  trigger: string,
  match: MatchMode,
  response: string,
): Promise<AddResult> {
  const t = normaliseTrigger(trigger).slice(0, 100);
  const exists = await AutoReplyModel.exists({ guildId, trigger: t });
  if (!exists && (await AutoReplyModel.countDocuments({ guildId })) >= MAX_RULES_PER_SERVER) return "limit";
  await AutoReplyModel.updateOne(
    { guildId, trigger: t },
    { $set: { match, response: response.trim().slice(0, 500), createdBy }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  invalidate(guildId);
  return exists ? "updated" : "added";
}

export async function removeRule(guildId: string, trigger: string): Promise<boolean> {
  const res = await AutoReplyModel.deleteOne({ guildId, trigger: normaliseTrigger(trigger) });
  invalidate(guildId);
  return res.deletedCount === 1;
}

export async function deleteRulesForGuild(guildId: string): Promise<void> {
  await AutoReplyModel.deleteMany({ guildId });
  invalidate(guildId);
}

// Per-channel cooldown so a busy channel can't turn the bot into a spam cannon.
const lastReply = new Map<string, number>();
export const AUTOREPLY_COOLDOWN_MS = 10_000;

export function takeReplyCooldown(channelId: string, now = Date.now()): boolean {
  const last = lastReply.get(channelId);
  if (last !== undefined && now - last < AUTOREPLY_COOLDOWN_MS) return false;
  lastReply.set(channelId, now);
  return true;
}
