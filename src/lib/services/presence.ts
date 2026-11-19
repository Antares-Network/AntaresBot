import { container } from "@sapphire/framework";
import { ActivityType, type ActivitiesOptions, type Client } from "discord.js";
import mongoose from "mongoose";
import { BotConfigModel, type StatusType } from "../db/models.js";
import { VERSION } from "../constants.js";
import { DEFAULT_ROTATION, renderStatus, type StatusEntry, type StatusVars } from "../features/presence.js";
import { getBotStats } from "./stats.js";

export interface PresenceConfig {
  rotation: StatusEntry[];
  /** True while the built-in default is in use (never edited). */
  isDefault: boolean;
  intervalSec: number;
  pinned: StatusEntry | null;
  rev: number;
}

export async function getPresenceConfig(): Promise<PresenceConfig> {
  const doc = await BotConfigModel.findById("global").lean();
  const stored = doc?.statusRotation;
  return {
    rotation: stored ? stored.map((e) => ({ text: e.text, type: e.type })) : [...DEFAULT_ROTATION],
    isDefault: !stored,
    intervalSec: doc?.statusIntervalSec ?? 300,
    pinned: doc?.statusPinned ? { text: doc.statusPinned.text, type: doc.statusPinned.type } : null,
    rev: doc?.rev ?? 0,
  };
}

export class PresenceConflictError extends Error {}

/**
 * Change the presence config with compare-and-set on `rev`, retrying on contention, then
 * apply it right away. `change` returns the fields to store (or null to leave it unchanged).
 */
export async function updatePresenceConfig(
  change: (cur: PresenceConfig) => Partial<{ rotation: StatusEntry[] | null; intervalSec: number; pinned: StatusEntry | null }> | null,
): Promise<PresenceConfig> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const cur = await getPresenceConfig();
    const patch = change(cur);
    if (!patch) return cur;
    const $set: Record<string, unknown> = { rev: cur.rev + 1 };
    if ("rotation" in patch) $set.statusRotation = patch.rotation;
    if (patch.intervalSec !== undefined) $set.statusIntervalSec = patch.intervalSec;
    if ("pinned" in patch) $set.statusPinned = patch.pinned;
    // trusted(): sanitizeFilter would otherwise neutralise this code-written operator.
    const filter = { _id: "global", rev: cur.rev === 0 ? mongoose.trusted({ $in: [0, null] }) : cur.rev };
    try {
      // runValidators: enforce the schema's length/enum/range rules on every write.
      const res = await BotConfigModel.updateOne(filter, { $set }, { upsert: cur.rev === 0, runValidators: true });
      if (res.matchedCount === 1 || res.upsertedCount === 1) {
        presence.kick();
        return await getPresenceConfig();
      }
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err; // lost an upsert race: retry
    }
  }
  throw new PresenceConflictError("The status rotation was being changed at the same time; please try again.");
}

/** Live values for placeholders. */
export async function statusVars(client: Client<true>): Promise<StatusVars> {
  const stats = await getBotStats().catch(() => null);
  let users = 0;
  for (const g of client.guilds.cache.values()) users += g.memberCount;
  return {
    servers: client.guilds.cache.size,
    users,
    messages: stats?.totalMessages ?? 0,
    uptimeMs: client.uptime,
    pingMs: client.ws.ping,
    version: VERSION,
    commands: container.stores.get("commands").size,
  };
}

const TYPE: Record<StatusType, ActivityType> = {
  playing: ActivityType.Playing,
  watching: ActivityType.Watching,
  listening: ActivityType.Listening,
  competing: ActivityType.Competing,
  custom: ActivityType.Custom,
};

export function toActivity(entry: StatusEntry, vars: StatusVars): ActivitiesOptions {
  const text = renderStatus(entry.text, vars);
  // Custom statuses show `state`, with no "Playing" prefix.
  return entry.type === "custom" ? { type: ActivityType.Custom, name: "Custom Status", state: text } : { type: TYPE[entry.type], name: text };
}

/**
 * The rotation loop. A self-rescheduling timer (not setInterval) so interval changes take
 * effect on the next tick, and kick() applies an edit immediately. Placeholders are
 * re-rendered every time a status is shown, so counts stay current.
 */
class PresenceRotation {
  private timer: NodeJS.Timeout | null = null;
  private client: Client<true> | null = null;
  private index = 0;
  private running = false;

  public start(client: Client<true>): void {
    this.client = client;
    this.schedule(0);
  }

  public stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.client = null;
  }

  /** Apply the current config now (after an edit). */
  public kick(): void {
    if (this.client) this.schedule(0);
  }

  private schedule(ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), ms);
  }

  private async tick(): Promise<void> {
    const client = this.client;
    if (!client || this.running) return;
    this.running = true;
    let next = 300_000;
    try {
      const cfg = await getPresenceConfig();
      next = cfg.intervalSec * 1000;
      const entry = cfg.pinned ?? cfg.rotation[this.index % Math.max(cfg.rotation.length, 1)];
      if (!cfg.pinned) this.index = (this.index + 1) % Math.max(cfg.rotation.length, 1);
      if (entry) client.user.setPresence({ status: "online", activities: [toActivity(entry, await statusVars(client))] });
    } catch (err) {
      container.logger.warn("Status rotation failed:", err);
    } finally {
      this.running = false;
      if (this.client) this.schedule(next);
    }
  }
}

export const presence = new PresenceRotation();
