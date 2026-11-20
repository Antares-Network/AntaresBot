/**
 * Integration tests against a real MongoDB (mongodb-memory-server), so the migration,
 * atomic writes, and buffering are exercised exactly as in production.
 */
import type { Guild, User } from "discord.js";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { importV1Data, moveBirthdayTimezones, V1_IMPORT } from "../src/lib/db/migrations.js";
import { ALL_MODELS, BotStatsModel, GateEntryModel, MigrationModel, ServerModel, UserModel } from "../src/lib/db/models/index.js";
import { commitCount } from "../src/lib/services/counting.js";
import { gate } from "../src/lib/services/gate.js";
import {
  clearDeletedChannel,
  countMessage,
  deleteServer,
  flushServerWrites,
  getCountingChannelId,
  getSettings,
  queueMemberCount,
  setChannel,
  syncServers,
} from "../src/lib/services/servers.js";
import {
  deleteUserData,
  flushUserActivity,
  getUserProfile,
  recordCommand,
  recordCount,
  setPrivateProfile,
} from "../src/lib/services/users.js";

const G1 = "788541416740487218";
const G2 = "775216104012120124";
const U1 = "603629606154666024";
const U2 = "736086156759924762";
const C1 = "800000000000000001";
const C2 = "800000000000000002";

let mongo: MongoMemoryServer;

function connectedDb() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("not connected");
  return db;
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  mongoose.set("strictQuery", true);
  mongoose.set("sanitizeFilter", true);
  await mongoose.connect(mongo.getUri("antaresbot"));
  await Promise.all(ALL_MODELS.map((m) => (m as typeof ServerModel).createIndexes()));
}, 180_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  const db = connectedDb();
  for (const c of await db.collections()) await c.deleteMany({});
  gate.invalidate();
});

const fakeGuild = (id: string, extra: Partial<{ name: string; ownerId: string; memberCount: number }> = {}) =>
  ({
    id,
    name: extra.name ?? `Guild ${id.slice(-3)}`,
    ownerId: extra.ownerId ?? U1,
    memberCount: extra.memberCount ?? 10,
    joinedAt: new Date("2024-01-01T00:00:00Z"),
    iconURL: () => null,
  }) as unknown as Guild;

const fakeUser = (id: string, username = `user${id.slice(-3)}`) => ({ id, username, bot: false }) as unknown as User;

// ---------------------------------------------------------------------------
describe("v1 → v2 import", () => {
  async function seedV1() {
    const db = connectedDb();
    await db.collection("guilds").insertMany([
      {
        GUILD_ID: G1,
        GUILD_NAME: "Antares",
        GUILD_OWNER_ID: U1,
        GUILD_MEMBER_COUNT: "42",
        GUILD_MESSAGES: "1500",
        GUILD_JOIN_DATE: "Thu Dec 17 2020 10:00:00 GMT-0600 (Central Standard Time)",
        GUILD_ICON_URL: "https://cdn.discordapp.com/icons/x.png",
      },
      // duplicate from the v1 docCreate race, with a later date and fewer messages
      { GUILD_ID: G1, GUILD_NAME: "Antares", GUILD_MESSAGES: "7", GUILD_JOIN_DATE: "Fri Jan 01 2021 10:00:00 GMT-0600" },
      { GUILD_ID: G2, GUILD_NAME: "Other", GUILD_OWNER_ID: U2, GUILD_MESSAGES: null, GUILD_JOIN_DATE: "garbage" },
      { GUILD_ID: "not-an-id", GUILD_NAME: "Broken" },
    ]);
    await db.collection("piis").insertMany([
      {
        GUILD_ID: G1,
        GUILD_DEFAULT_CHANNEL: `<#${C1}>`, // v1 /setup bug
        GUILD_ADMIN_CHANNEL: C2,
        GUILD_COUNTING_CHANNEL_ID: null,
        GUILD_COUNTING_NUMBER: "99",
        GUILD_MUSIC_CHANNEL: "legacy, unused",
      },
      { GUILD_ID: G2, GUILD_COUNTING_CHANNEL_ID: C1 }, // no counting number at all
    ]);
    await db.collection("gates").insertOne({
      NAME: "GATE",
      BANNED_USERS: [U2, "junk"],
      BANNED_GUILDS: [G2],
      BANNED_OWNERS: [],
      IGNORED_GUILDS: null, // v1 gateCreate wrote null
      GUILD_OWNER_ID: [U1, U2],
      TOTAL_MESSAGES: "1507",
      TOTAL_SERVERS: "2",
      TOTAL_USERS: "52",
      UPDATE_TIME: "Sun Nov 13 2022 19:49:09 GMT-0600 (Central Standard Time)",
    });
  }

  it("carries every v1 value into the v2 shape", async () => {
    await seedV1();
    const report = await importV1Data();
    expect(report).toMatchObject({ servers: 2, gateEntries: 2, stats: true, skippedInvalidIds: 1, unknownJoinDates: 1 });

    const s1 = await ServerModel.findById(G1).lean();
    expect(s1).toMatchObject({
      name: "Antares",
      ownerId: U1,
      iconUrl: "https://cdn.discordapp.com/icons/x.png",
      memberCount: 42,
      messageCount: 1500, // max of duplicates, not double-counted
      channels: { bot: C1, admin: C2, counting: null }, // "<#id>" unwrapped
      counting: { current: 99 },
    });
    expect(s1?.joinedAt.toISOString()).toBe("2020-12-17T16:00:00.000Z"); // earliest duplicate

    const s2 = await ServerModel.findById(G2).lean();
    expect(s2).toMatchObject({ messageCount: 0, channels: { counting: C1 }, counting: { current: 0 } });

    const entries = await GateEntryModel.find().sort({ _id: 1 }).lean();
    expect(entries.map((e) => e._id)).toEqual([`guild:${G2}`, `user:${U2}`]);

    const stats = await BotStatsModel.findById("global").lean();
    expect(stats).toMatchObject({ totalMessages: 1507, totalServers: 2, totalUsers: 52, guildOwnerIds: [U1, U2] });
    expect(stats?.updatedAt).toBeInstanceOf(Date);
  });

  it("never modifies the v1 collections", async () => {
    await seedV1();
    const db = connectedDb();
    const snapshot = async () => ({
      guilds: await db.collection("guilds").find().sort({ _id: 1 }).toArray(),
      piis: await db.collection("piis").find().sort({ _id: 1 }).toArray(),
      gates: await db.collection("gates").find().sort({ _id: 1 }).toArray(),
    });
    const before = await snapshot();
    await importV1Data();
    expect(await snapshot()).toEqual(before);
  });

  it("runs once, and a forced re-run never overwrites v2 data", async () => {
    await seedV1();
    await importV1Data();
    expect(await importV1Data()).toBeNull(); // recorded in `migrations`

    await setChannel(G1, "bot", C2); // a v2 change
    await MigrationModel.deleteOne({ _id: V1_IMPORT }); // simulate a crash before recording
    await importV1Data();
    expect((await ServerModel.findById(G1).lean())?.channels?.bot).toBe(C2);
  });

  it("is a no-op on an empty database", async () => {
    expect(await importV1Data()).toMatchObject({ servers: 0, gateEntries: 0, stats: false });
  });
});

// ---------------------------------------------------------------------------
describe("server time zone migration", () => {
  const server = (id: string, settings: object) =>
    ServerModel.create({ _id: id, name: "S", memberCount: 1, joinedAt: new Date(), settings });

  it("moves birthday time zones to the server setting once, never overwriting one already set", async () => {
    await server("788541416740487218", { birthdays: { timezone: "America/Chicago", hour: 8 } });
    await server("775216104012120124", { birthdays: { timezone: "Asia/Tokyo" }, general: { timezone: "Europe/Paris" } });
    await server("736086156759924762", { birthdays: { timezone: "UTC" } });
    await server("761646965624274954", {});

    expect(await moveBirthdayTimezones()).toBe(1);
    const tz = async (id: string) =>
      ((await ServerModel.findById(id).lean())?.settings as { general?: { timezone?: string } }).general?.timezone;
    expect(await tz("788541416740487218")).toBe("America/Chicago");
    expect(await tz("775216104012120124")).toBe("Europe/Paris");
    expect(await tz("736086156759924762")).toBeUndefined();
    expect(await tz("761646965624274954")).toBeUndefined();
    expect(await moveBirthdayTimezones()).toBeNull(); // recorded in `migrations`
  });
});

describe("servers", () => {
  it("syncServers creates new servers and refreshes live fields without clobbering settings", async () => {
    expect(await syncServers([fakeGuild(G1), fakeGuild(G2)])).toBe(2);
    await setChannel(G1, "bot", C1);
    countMessage(G1);
    await flushServerWrites();

    expect(await syncServers([fakeGuild(G1, { name: "Renamed", memberCount: 99 })])).toBe(0);
    const s = await ServerModel.findById(G1).lean();
    expect(s).toMatchObject({ name: "Renamed", memberCount: 99, messageCount: 1, channels: { bot: C1 } });
  });

  it("setChannel never creates a document for an unknown server", async () => {
    expect(await setChannel(G1, "bot", C1)).toBe(false);
    expect(await ServerModel.countDocuments()).toBe(0);
  });

  it("clears settings that point at a deleted channel, and the counting cache follows", async () => {
    await syncServers([fakeGuild(G1)]);
    await setChannel(G1, "counting", C1);
    await setChannel(G1, "bot", C1);
    expect(await getCountingChannelId(G1)).toBe(C1); // now cached
    expect(await clearDeletedChannel(G1, C1)).toEqual(["bot", "counting"]);
    expect(await getCountingChannelId(G1)).toBeNull();
  });

  it("re-queues only failed increments when part of a bulk write fails", async () => {
    await syncServers([fakeGuild(G1), fakeGuild(G2)]);
    // Corrupt G2 so $inc on it fails server-side.
    await ServerModel.collection.updateOne({ _id: G2 as never }, { $set: { messageCount: "corrupt" } });
    countMessage(G1);
    countMessage(G2);
    await expect(flushServerWrites()).rejects.toThrow();
    expect((await ServerModel.findById(G1).lean())?.messageCount).toBe(1);

    await ServerModel.collection.updateOne({ _id: G2 as never }, { $set: { messageCount: 0 } });
    await flushServerWrites(); // retries ONLY G2
    expect((await ServerModel.findById(G1).lean())?.messageCount).toBe(1); // not double counted
    expect((await ServerModel.findById(G2).lean())?.messageCount).toBe(1);
  });

  it("deleteServer removes the document and drops unflushed counts", async () => {
    await syncServers([fakeGuild(G1)]);
    countMessage(G1);
    await deleteServer(G1);
    await flushServerWrites();
    expect(await ServerModel.countDocuments()).toBe(0);
  });

  it("getSettings normalises corrupt stored values", async () => {
    await ServerModel.collection.insertOne({
      _id: G1 as never,
      channels: { bot: "<#nope>", admin: 5, counting: C1 },
      counting: { current: "abc" },
    });
    expect(await getSettings(G1)).toEqual({
      botChannelId: null,
      adminChannelId: null,
      countingChannelId: C1,
      countingCurrent: 0,
    });
  });
});

// ---------------------------------------------------------------------------
describe("write buffer guarantees", () => {
  it("/remove during an in-flight flush cannot be undone by that flush", async () => {
    recordCommand(fakeUser(U1), "cat");
    const inFlight = flushUserActivity(); // batch taken, upsert on its way
    const removed = deleteUserData(U1); // must wait for it, then delete
    await Promise.all([inFlight, removed]);
    await flushUserActivity();
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it("flushes are serialised, so a shutdown flush waits for the running one", async () => {
    await syncServers([fakeGuild(G1)]);
    countMessage(G1);
    const first = flushServerWrites();
    countMessage(G1);
    const second = flushServerWrites();
    await Promise.all([first, second]);
    expect((await ServerModel.findById(G1).lean())?.messageCount).toBe(2);
  });

  it("drops (does not double-apply) a batch after an ambiguous network error", async () => {
    await syncServers([fakeGuild(G1)]);
    const spy = vi
      .spyOn(ServerModel.collection, "bulkWrite")
      .mockRejectedValueOnce(new mongoose.mongo.MongoNetworkError("socket closed after send"));
    countMessage(G1);
    await expect(flushServerWrites()).rejects.toThrow("socket closed");
    spy.mockRestore();
    expect(await flushServerWrites()).toBe(0); // nothing re-queued
  });

  it("re-queues a batch that provably never reached the server", async () => {
    await syncServers([fakeGuild(G1)]);
    const spy = vi
      .spyOn(ServerModel.collection, "bulkWrite")
      .mockRejectedValueOnce(new mongoose.mongo.MongoNotConnectedError("not connected"));
    countMessage(G1);
    await expect(flushServerWrites()).rejects.toThrow();
    spy.mockRestore();
    await flushServerWrites();
    expect((await ServerModel.findById(G1).lean())?.messageCount).toBe(1);
  });

  it("buffers member counts and keeps only the latest", async () => {
    await syncServers([fakeGuild(G1, { memberCount: 10 })]);
    queueMemberCount(G1, 11);
    queueMemberCount(G1, 12);
    queueMemberCount(G1, 9);
    await flushServerWrites();
    expect((await ServerModel.findById(G1).lean())?.memberCount).toBe(9);
  });
});

// ---------------------------------------------------------------------------
describe("counting", () => {
  it("commitCount is compare-and-set", async () => {
    await syncServers([fakeGuild(G1)]);
    expect((await commitCount(G1, 0, 1)).committed).toBe(true);
    expect((await commitCount(G1, 0, 1)).committed).toBe(false); // someone else already advanced it
    expect((await getSettings(G1))?.countingCurrent).toBe(1);
  });
});

// ---------------------------------------------------------------------------
describe("users", () => {
  it("creates one document per user with command and counting stats", async () => {
    const u = fakeUser(U1, "nate");
    recordCommand(u, "cat");
    recordCommand(u, "cat");
    recordCommand(u, "ask");
    recordCount(u, true); // same flush window as the commands: must not conflict
    recordCount(u, false);
    await flushUserActivity();

    const p = await getUserProfile(U1);
    expect(p).toMatchObject({
      username: "nate",
      commandsUsed: 3,
      topCommands: [
        { name: "cat", uses: 2 },
        { name: "ask", uses: 1 },
      ],
      countingCorrect: 1,
      countingMistakes: 1,
      privateProfile: false,
    });
    expect(p?.firstSeenAt).toBeInstanceOf(Date);
    expect(await UserModel.countDocuments()).toBe(1);
  });

  it("firstSeenAt is set once; later activity only moves lastSeenAt", async () => {
    recordCommand(fakeUser(U1), "ping");
    await flushUserActivity();
    const first = (await getUserProfile(U1))?.firstSeenAt;
    await new Promise((r) => setTimeout(r, 5));
    recordCommand(fakeUser(U1), "ping");
    await flushUserActivity();
    const p = await getUserProfile(U1);
    expect(p?.firstSeenAt).toEqual(first);
    expect(p?.lastSeenAt?.getTime() ?? 0).toBeGreaterThan(first?.getTime() ?? Infinity);
  });

  it("never stores unsafe command names as document keys", async () => {
    recordCommand(fakeUser(U1), "$where");
    recordCommand(fakeUser(U1), "a.b");
    await flushUserActivity();
    const p = await getUserProfile(U1);
    expect(p?.commandsUsed).toBe(2);
    expect(p?.topCommands).toEqual([]);
  });

  it("ignores bots", async () => {
    recordCommand({ id: U2, username: "bot", bot: true } as unknown as User, "ping");
    await flushUserActivity();
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it("stores the privateProfile preference", async () => {
    await setPrivateProfile(fakeUser(U1), true);
    expect((await getUserProfile(U1))?.privateProfile).toBe(true);
    await setPrivateProfile(fakeUser(U1), false);
    expect((await getUserProfile(U1))?.privateProfile).toBe(false);
  });

  it("/remove deletes the document AND any unflushed activity", async () => {
    recordCommand(fakeUser(U1), "cat");
    await flushUserActivity();
    recordCommand(fakeUser(U1), "dog"); // still buffered
    expect(await deleteUserData(U1)).toBe(true);
    await flushUserActivity();
    expect(await UserModel.countDocuments()).toBe(0);
    expect(await deleteUserData(U1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe("gate", () => {
  it("adds and removes entries atomically and reports changes", async () => {
    expect(await gate.add("user", U1)).toBe(true);
    expect(await gate.add("user", U1)).toBe(false);
    expect(await gate.isBanned({ userId: U1 })).toBe(true);
    expect(await gate.isBanned({ userId: U2, ownerId: U1 })).toBe(false); // user ban ≠ owner ban
    expect(await gate.remove("user", U1)).toBe(true);
    expect(await gate.remove("user", U1)).toBe(false);
    expect(await gate.isBanned({ userId: U1 })).toBe(false);
  });

  it("does not cache a read that raced a ban", async () => {
    let release!: () => void;
    const gateOpen = new Promise<void>((r) => (release = r));
    const realFind = GateEntryModel.find.bind(GateEntryModel);
    const spy = vi.spyOn(GateEntryModel, "find").mockImplementationOnce(((...args: Parameters<typeof realFind>) => {
      const q = realFind(...args);
      return { lean: async () => { const rows = await q.lean(); await gateOpen; return rows; } };
    }) as never);

    const staleRead = gate.get(); // reads the empty gate, then stalls
    await new Promise((r) => setTimeout(r, 20));
    await gate.add("guild", G1);
    release();
    expect((await staleRead).bannedGuilds.has(G1)).toBe(false); // that read was pre-ban...
    expect(await gate.isBanned({ guildId: G1 })).toBe(true); // ...but it was not cached
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
describe("query injection guard", () => {
  it("sanitizeFilter neutralises operator objects in filters", async () => {
    await syncServers([fakeGuild(G1)]);
    const evil = { $ne: null } as unknown as string;
    // Without the guard this would match every document. With it, the object is treated as
    // a literal value ($eq), which can't be cast to a string ID, so the query is rejected.
    const result = await ServerModel.findOne({ _id: evil })
      .lean()
      .catch((e: unknown) => e);
    expect(result).toBeInstanceOf(mongoose.Error.CastError);
  });
});
