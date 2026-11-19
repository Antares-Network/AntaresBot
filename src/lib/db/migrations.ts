import { container } from "@sapphire/framework";
import mongoose from "mongoose";
import { toCount, toSnowflake } from "../util.js";
import {
  ALL_MODELS,
  BotStatsModel,
  GateEntryModel,
  gateEntryId,
  MigrationModel,
  ServerModel,
  type GateKind,
} from "./models.js";

export const V1_IMPORT = "v1-import";

interface ImportedServer {
  _id: string;
  name: string;
  ownerId: string | null;
  iconUrl: string | null;
  memberCount: number;
  messageCount: number;
  joinedAt: Date | null;
  channels: { bot: string | null; admin: string | null; counting: string | null };
  counting: { current: number };
}

export interface ImportReport {
  servers: number;
  gateEntries: number;
  stats: boolean;
  skippedInvalidIds: number;
  unknownJoinDates: number;
}

/** v1 stored dates as Date#toString() ("Thu Dec 17 2020 10:00:00 GMT-0600 (...)"). */
function parseLegacyDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const d = new Date(value.replace(/\s*\(.*\)\s*$/, ""));
  return Number.isNaN(d.getTime()) ? null : d;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Copy v1 data (guilds + piis + gates) into the v2 collections.
 *
 * Safety properties:
 *  - v1 collections are only read, never modified (the old bot can still be run on them).
 *  - Every write is an upsert with $setOnInsert, so it never overwrites v2 data and is
 *    safe to re-run after a crash part-way through.
 *  - It is recorded in `migrations` only after everything succeeded.
 */
export async function importV1Data(db = mongoose.connection.db): Promise<ImportReport | null> {
  if (!db) throw new Error("database not connected");
  if (await MigrationModel.exists({ _id: V1_IMPORT })) return null;

  const report: ImportReport = { servers: 0, gateEntries: 0, stats: false, skippedInvalidIds: 0, unknownJoinDates: 0 };
  const servers = new Map<string, ImportedServer>();
  const serverFor = (id: string): ImportedServer => {
    let s = servers.get(id);
    if (!s) {
      s = {
        _id: id,
        name: "",
        ownerId: null,
        iconUrl: null,
        memberCount: 0,
        messageCount: 0,
        joinedAt: null,
        channels: { bot: null, admin: null, counting: null },
        counting: { current: 0 },
      };
      servers.set(id, s);
    }
    return s;
  };

  // v1 `guilds`: identity + stats. Duplicate documents for one guild (a v1 race) are merged.
  for await (const doc of db.collection("guilds").find({})) {
    const id = toSnowflake(doc.GUILD_ID);
    if (!id) {
      report.skippedInvalidIds++;
      continue;
    }
    const s = serverFor(id);
    s.name ||= str(doc.GUILD_NAME);
    s.ownerId ??= toSnowflake(doc.GUILD_OWNER_ID);
    s.iconUrl ??= str(doc.GUILD_ICON_URL) || null;
    s.memberCount = Math.max(s.memberCount, toCount(doc.GUILD_MEMBER_COUNT));
    s.messageCount = Math.max(s.messageCount, toCount(doc.GUILD_MESSAGES));
    const joined = parseLegacyDate(doc.GUILD_JOIN_DATE);
    if (joined && (!s.joinedAt || joined < s.joinedAt)) s.joinedAt = joined;
  }

  // v1 `piis`: per-guild settings. Channel IDs may be "<#id>" (v1 /setup bug).
  for await (const doc of db.collection("piis").find({})) {
    const id = toSnowflake(doc.GUILD_ID);
    if (!id) {
      report.skippedInvalidIds++;
      continue;
    }
    const s = serverFor(id);
    s.name ||= str(doc.GUILD_NAME);
    s.channels.bot ??= toSnowflake(doc.GUILD_DEFAULT_CHANNEL);
    s.channels.admin ??= toSnowflake(doc.GUILD_ADMIN_CHANNEL);
    s.channels.counting ??= toSnowflake(doc.GUILD_COUNTING_CHANNEL_ID);
    s.counting.current = Math.max(s.counting.current, toCount(doc.GUILD_COUNTING_NUMBER));
  }

  const now = new Date();
  if (servers.size > 0) {
    const ops = [...servers.values()].map((s) => {
      if (!s.joinedAt) report.unknownJoinDates++;
      const { _id, ...rest } = s;
      return {
        updateOne: {
          filter: { _id },
          update: { $setOnInsert: { ...rest, joinedAt: s.joinedAt ?? now } },
          upsert: true,
        },
      };
    });
    const res = await ServerModel.bulkWrite(ops, { ordered: false });
    report.servers = res.upsertedCount;
  }

  // v1 `gates`: one global document holding ban/ignore arrays and aggregate stats.
  const gate = await db.collection("gates").findOne({ NAME: "GATE" });
  if (gate) {
    const lists: [GateKind, unknown][] = [
      ["user", gate.BANNED_USERS],
      ["guild", gate.BANNED_GUILDS],
      ["owner", gate.BANNED_OWNERS],
      ["ignored_guild", gate.IGNORED_GUILDS],
    ];
    const ops = lists.flatMap(([kind, values]) =>
      (Array.isArray(values) ? values : [])
        .map((v) => toSnowflake(typeof v === "string" ? v : String(v)))
        .filter((v): v is string => v !== null)
        .map((targetId) => ({
          updateOne: {
            filter: { _id: gateEntryId(kind, targetId) },
            update: { $setOnInsert: { kind, targetId, createdAt: now } },
            upsert: true,
          },
        })),
    );
    if (ops.length > 0) {
      const res = await GateEntryModel.bulkWrite(ops, { ordered: false });
      report.gateEntries = res.upsertedCount;
    }

    const owners = Array.isArray(gate.GUILD_OWNER_ID) ? gate.GUILD_OWNER_ID : [];
    const res = await BotStatsModel.updateOne(
      { _id: "global" },
      {
        $setOnInsert: {
          totalMessages: toCount(gate.TOTAL_MESSAGES),
          totalServers: toCount(gate.TOTAL_SERVERS),
          totalUsers: toCount(gate.TOTAL_USERS),
          guildOwnerIds: owners.map((o) => toSnowflake(String(o))).filter((o): o is string => o !== null),
          updatedAt: parseLegacyDate(gate.UPDATE_TIME),
        },
      },
      { upsert: true },
    );
    report.stats = res.upsertedCount > 0;
  }

  // Upsert (not create) so two instances racing on first boot can't fail on a duplicate key.
  await MigrationModel.updateOne(
    { _id: V1_IMPORT },
    { $setOnInsert: { ranAt: now, details: { ...report } } },
    { upsert: true },
  );
  return report;
}

/** Startup entry point: create indexes, then run the one-time v1 import if needed. */
export async function runMigrations(): Promise<void> {
  const log = container.logger;
  // createIndexes only adds; it never drops indexes that exist but aren't declared here.
  await Promise.all(ALL_MODELS.map((m) => (m as typeof ServerModel).createIndexes()));

  const report = await importV1Data();
  if (report) {
    log.info(
      `Imported v1 data: ${report.servers} servers, ${report.gateEntries} ban/ignore entries, ` +
        `stats=${report.stats}, skipped ${report.skippedInvalidIds} invalid IDs, ` +
        `${report.unknownJoinDates} servers without a parseable join date. ` +
        "v1 collections (guilds, piis, gates) were left untouched.",
    );
  }
}
