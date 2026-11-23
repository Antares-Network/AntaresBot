import { GateEntryModel, gateEntryId, type GateKind } from "../db/models/index.js";

export type { GateKind };

interface GateSnapshot {
  bannedUsers: ReadonlySet<string>;
  bannedGuilds: ReadonlySet<string>;
  bannedOwners: ReadonlySet<string>;
  ignoredGuilds: ReadonlySet<string>;
}

const CACHE_TTL_MS = 60_000;

/**
 * Bans and ignores. Each entry is its own document, so add/remove are single atomic
 * writes. Reads come from a short-lived in-memory snapshot that is invalidated on every
 * write; a generation counter keeps a read that raced a write from caching stale data.
 */
class GateService {
  private snapshot: GateSnapshot | null = null;
  private loadedAt = 0;
  private inflight: Promise<GateSnapshot> | null = null;
  private generation = 0;

  public async get(): Promise<GateSnapshot> {
    if (this.snapshot && Date.now() - this.loadedAt < CACHE_TTL_MS) return this.snapshot;
    if (!this.inflight) {
      const p = this.load().finally(() => {
        if (this.inflight === p) this.inflight = null;
      });
      this.inflight = p;
    }
    return this.inflight;
  }

  public invalidate(): void {
    this.generation++;
    this.snapshot = null;
    this.inflight = null;
  }

  public async isIgnored(guildId: string | null | undefined): Promise<boolean> {
    return guildId ? (await this.get()).ignoredGuilds.has(guildId) : false;
  }

  /** Banned guild, banned user, or a guild whose owner is banned. */
  public async isBanned(ids: { userId?: string | null; guildId?: string | null; ownerId?: string | null }) {
    const g = await this.get();
    return (
      (!!ids.guildId && g.bannedGuilds.has(ids.guildId)) ||
      (!!ids.userId && g.bannedUsers.has(ids.userId)) ||
      (!!ids.ownerId && g.bannedOwners.has(ids.ownerId))
    );
  }

  /** Returns false if the entry already existed. */
  public async add(kind: GateKind, targetId: string): Promise<boolean> {
    const res = await GateEntryModel.updateOne(
      { _id: gateEntryId(kind, targetId) },
      { $setOnInsert: { kind, targetId, createdAt: new Date() } },
      { upsert: true },
    );
    this.invalidate();
    return res.upsertedCount > 0;
  }

  /** Returns false if there was no such entry. */
  public async remove(kind: GateKind, targetId: string): Promise<boolean> {
    const res = await GateEntryModel.deleteOne({ _id: gateEntryId(kind, targetId) });
    this.invalidate();
    return res.deletedCount > 0;
  }

  private async load(): Promise<GateSnapshot> {
    const gen = this.generation;
    const entries = await GateEntryModel.find({}, { kind: 1, targetId: 1 }).lean();
    const sets: Record<GateKind, Set<string>> = {
      user: new Set(),
      guild: new Set(),
      owner: new Set(),
      ignored_guild: new Set(),
    };
    for (const e of entries) {
      if (typeof e.targetId === "string" && e.kind in sets) sets[e.kind].add(e.targetId);
    }
    const snapshot: GateSnapshot = {
      bannedUsers: sets.user,
      bannedGuilds: sets.guild,
      bannedOwners: sets.owner,
      ignoredGuilds: sets.ignored_guild,
    };
    if (gen === this.generation) {
      this.snapshot = snapshot;
      this.loadedAt = Date.now();
    }
    return snapshot;
  }
}

export const gate = new GateService();
