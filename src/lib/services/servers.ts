import type { Guild } from "discord.js";
import { ServerModel } from "../db/models.js";
import { WriteBuffer } from "../db/writeBuffer.js";
import { toCount, toSnowflake } from "../util.js";

export type ChannelKind = "bot" | "admin" | "counting";

export interface ServerSettings {
  botChannelId: string | null;
  adminChannelId: string | null;
  countingChannelId: string | null;
  countingCurrent: number;
}

export interface ServerInfo {
  id: string;
  name: string;
  ownerId: string | null;
  memberCount: number;
  messageCount: number;
  joinedAt: Date | null;
}

/** Live guild fields we mirror into the database. */
function liveFields(guild: Guild) {
  return {
    name: guild.name,
    ownerId: guild.ownerId,
    iconUrl: guild.iconURL(),
    memberCount: guild.memberCount,
  };
}

/**
 * Create or refresh server documents in ONE bulk write (v1 did 2+ queries per guild at
 * startup). Inserts never clobber settings/stats of an existing document.
 * Returns how many servers were new.
 */
export async function syncServers(guilds: Iterable<Guild>): Promise<number> {
  const ops = [...guilds].map((guild) => ({
    updateOne: {
      filter: { _id: guild.id },
      update: {
        $set: liveFields(guild),
        $setOnInsert: {
          joinedAt: guild.joinedAt,
          messageCount: 0,
          channels: { bot: null, admin: null, counting: null },
          counting: { current: 0 },
        },
      },
      upsert: true,
    },
  }));
  if (ops.length === 0) return 0;
  const res = await ServerModel.bulkWrite(ops, { ordered: false });
  return res.upsertedCount;
}

export async function ensureServer(guild: Guild): Promise<boolean> {
  return (await syncServers([guild])) > 0;
}

/** Lean reads are raw data despite their types, so every field is normalised here. */
export async function getSettings(guildId: string): Promise<ServerSettings | null> {
  const doc = await ServerModel.findById(guildId, { channels: 1, counting: 1 }).lean();
  if (!doc) return null;
  return {
    botChannelId: toSnowflake(doc.channels?.bot),
    adminChannelId: toSnowflake(doc.channels?.admin),
    countingChannelId: toSnowflake(doc.channels?.counting),
    countingCurrent: toCount(doc.counting?.current),
  };
}

export async function getServer(guildId: string): Promise<ServerInfo | null> {
  const doc = await ServerModel.findById(guildId).lean();
  if (!doc) return null;
  const joined = doc.joinedAt instanceof Date && !Number.isNaN(doc.joinedAt.getTime()) ? doc.joinedAt : null;
  return {
    id: guildId,
    name: typeof doc.name === "string" ? doc.name : "",
    ownerId: toSnowflake(doc.ownerId),
    memberCount: toCount(doc.memberCount),
    messageCount: toCount(doc.messageCount),
    joinedAt: joined,
  };
}

/**
 * Point a channel setting at `channelId` (or clear it with null). Never creates a
 * document: callers ensure the server exists first. Returns false if it doesn't.
 */
export async function setChannel(guildId: string, kind: ChannelKind, channelId: string | null): Promise<boolean> {
  const res = await ServerModel.updateOne({ _id: guildId }, { $set: { [`channels.${kind}`]: channelId } });
  invalidateCountingChannel(guildId);
  return res.matchedCount > 0;
}

/**
 * Clear every channel setting that pointed at a now-deleted channel. One read, and at
 * most one write; most deleted channels are none of the configured ones.
 */
export async function clearDeletedChannel(guildId: string, channelId: string): Promise<ChannelKind[]> {
  const doc = await ServerModel.findById(guildId, { channels: 1 }).lean();
  const cleared = (["bot", "admin", "counting"] as const).filter((k) => doc?.channels?.[k] === channelId);
  if (cleared.length === 0) return [];
  // Each cleared field is filtered on its expected value, so a concurrent /setup wins.
  const filter: Record<string, string> = { _id: guildId };
  const unset: Record<string, null> = {};
  for (const k of cleared) {
    filter[`channels.${k}`] = channelId;
    unset[`channels.${k}`] = null;
  }
  await ServerModel.updateOne(filter, { $set: unset });
  invalidateCountingChannel(guildId);
  return cleared;
}

export async function updateServer(
  guildId: string,
  patch: Partial<{ name: string; iconUrl: string | null; ownerId: string }>,
) {
  await ServerModel.updateOne({ _id: guildId }, { $set: patch });
}

/** Member joins/leaves can be bursty (raids, giveaways): buffer the latest count. */
export function queueMemberCount(guildId: string, memberCount: number): void {
  serverWrites.add(guildId, { set: { memberCount } });
}

/** Remove everything stored about a server (privacy policy: deleted when the bot leaves). */
export async function deleteServer(guildId: string) {
  await serverWrites.forget(guildId); // no buffered write may land after the delete
  await ServerModel.deleteOne({ _id: guildId });
  invalidateCountingChannel(guildId);
}

// ---------------------------------------------------------------------------
// Counting-channel lookup cache. Every guild message asks "is this the counting channel?".
// A per-guild generation counter stops a lookup that started before an invalidation from
// writing its stale answer back afterwards.
// ---------------------------------------------------------------------------
const COUNTING_CACHE_TTL_MS = 5 * 60_000;
const countingChannelCache = new Map<string, { id: string | null; at: number }>();
const countingGeneration = new Map<string, number>();

function invalidateCountingChannel(guildId: string) {
  countingChannelCache.delete(guildId);
  countingGeneration.set(guildId, (countingGeneration.get(guildId) ?? 0) + 1);
}

export async function getCountingChannelId(guildId: string): Promise<string | null> {
  const hit = countingChannelCache.get(guildId);
  if (hit && Date.now() - hit.at < COUNTING_CACHE_TTL_MS) return hit.id;
  const gen = countingGeneration.get(guildId) ?? 0;
  const doc = await ServerModel.findById(guildId, { "channels.counting": 1 }).lean();
  const id = toSnowflake(doc?.channels?.counting);
  if ((countingGeneration.get(guildId) ?? 0) === gen) {
    countingChannelCache.set(guildId, { id, at: Date.now() });
  }
  return id;
}

// ---------------------------------------------------------------------------
// Hot-path server writes (message counts, member counts): buffered and flushed in one bulk
// write. Never upserts: writes for a server we have no document for are simply dropped.
// ---------------------------------------------------------------------------
const serverWrites = new WriteBuffer("server-writes", ServerModel as never, { upsert: false });

export function countMessage(guildId: string): void {
  serverWrites.add(guildId, { inc: { messageCount: 1 } });
}

export function flushServerWrites(): Promise<number> {
  return serverWrites.flush();
}

export type SeqName = "case" | "suggestion" | "ticket";

/** Allocate the next per-server number (case #, suggestion #, ticket #) atomically. */
export async function nextSeq(guildId: string, name: SeqName): Promise<number> {
  const doc = await ServerModel.findOneAndUpdate(
    { _id: guildId },
    { $inc: { [`seq.${name}`]: 1 } },
    { returnDocument: "after", projection: { seq: 1 } },
  ).lean();
  const n = doc?.seq?.[name];
  if (typeof n !== "number") throw new Error(`no server document for ${guildId}`);
  return n;
}
