import type { Guild } from "discord.js";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  ALL_MODELS,
  AuditModel,
  AutoReplyModel,
  ConfessionModel,
  MemberModel,
  ReminderModel,
  ServerModel,
  StarboardModel,
  UserModel,
} from "../src/lib/db/models.js";
import { recordAudit } from "../src/lib/services/audit.js";
import { addRule, getRules, removeRule } from "../src/lib/services/autoreplies.js";
import { attachMessage, banConfessor, beginConfession } from "../src/lib/services/confessions.js";
import { commitCount, failCount, getCountingState } from "../src/lib/services/counting.js";
import { awardXp, flushMemberStats, getRank, leaderboard, recordMemberCount } from "../src/lib/services/members.js";
import { deleteAllGuildData, deleteAllUserData } from "../src/lib/services/privacy.js";
import { cancelReminder, claimDueReminders, createReminder, ReminderLimitError } from "../src/lib/services/reminders.js";
import { syncServers } from "../src/lib/services/servers.js";
import { getFeatureSettings, invalidateSettings, SettingsValidationError, updateSettings } from "../src/lib/services/settings.js";
import { updateStars } from "../src/lib/services/starboard.js";

const G = "788541416740487218";
const G2 = "775216104012120124";
const U1 = "603629606154666024";
const U2 = "736086156759924762";
const C = "800000000000000001";
const SECRET = "x".repeat(40);

let mongo: MongoMemoryServer;

function connectedDb() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("not connected");
  return db;
}

const fakeGuild = (id: string) =>
  ({ id, name: "Test", ownerId: U1, memberCount: 5, joinedAt: new Date(), iconURL: () => null }) as unknown as Guild;

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
  for (const c of await connectedDb().collections()) await c.deleteMany({});
  invalidateSettings(G);
  invalidateSettings(G2);
  await syncServers([fakeGuild(G), fakeGuild(G2)]);
});

describe("settings", () => {
  it("validates, stores, and is read back", async () => {
    await updateSettings(G, "levels", { enabled: true, announce: "dm" });
    const s = await getFeatureSettings(G);
    expect(s.levels).toMatchObject({ enabled: true, announce: "dm" });
    expect(s.welcome.enabled).toBe(false); // other sections untouched
  });
  it("rejects invalid values and unknown keys", async () => {
    await expect(updateSettings(G, "automod", { timeoutMinutes: 99999 })).rejects.toBeInstanceOf(SettingsValidationError);
    await expect(updateSettings(G, "levels", { bogus: true } as never)).rejects.toBeInstanceOf(SettingsValidationError);
    await expect(updateSettings(G, "levels", { roleRewards: [{ level: 1, roleId: "not-an-id" }] })).rejects.toBeInstanceOf(
      SettingsValidationError,
    );
  });
  it("falls back to defaults when the stored section is corrupt", async () => {
    await ServerModel.collection.updateOne({ _id: G as never }, { $set: { "settings.automod": { action: 42 } } });
    invalidateSettings(G);
    expect((await getFeatureSettings(G)).automod.action).toBe("delete");
  });
});

describe("levels", () => {
  it("awards XP with a cooldown and announces each level once", async () => {
    const t0 = 1_000_000;
    const first = await awardXp(G, U1, t0);
    expect(first?.xp).toBeGreaterThanOrEqual(15);
    expect(await awardXp(G, U1, t0 + 1000)).toBeNull(); // cooldown
    await MemberModel.updateOne({ _id: `${G}:${U1}` }, { $set: { xp: 95 } });
    const up = await awardXp(G, U1, t0 + 61_000);
    expect(up).toMatchObject({ level: 1, leveledUp: true });
    const again = await awardXp(G, U1, t0 + 122_000);
    expect(again?.leveledUp).toBe(false);
  });
  it("ranks and leaderboards per server", async () => {
    await MemberModel.create([
      { _id: `${G}:${U1}`, guildId: G, userId: U1, xp: 500 },
      { _id: `${G}:${U2}`, guildId: G, userId: U2, xp: 900 },
      { _id: `${G2}:${U1}`, guildId: G2, userId: U1, xp: 10_000 },
    ]);
    expect((await getRank(G, U1)).rank).toBe(2);
    expect((await leaderboard(G, "xp")).map((r) => r.userId)).toEqual([U2, U1]);
  });
  it("buffers per-server counting stats", async () => {
    recordMemberCount(G, U1, true);
    recordMemberCount(G, U1, true);
    recordMemberCount(G, U1, false);
    await flushMemberStats();
    expect(await getRank(G, U1)).toMatchObject({ countingCorrect: 2, countingMistakes: 1 });
  });
});

describe("counting upgrades", () => {
  it("tracks the high score and earns saves every 100", async () => {
    await ServerModel.updateOne({ _id: G }, { $set: { "counting.current": 99 } });
    const r = await commitCount(G, 99, 100);
    expect(r).toEqual({ committed: true, newHighScore: true, earnedSave: true });
    expect(await getCountingState(G)).toEqual({ current: 100, highScore: 100, saves: 1 });
  });
  it("caps saves at 3", async () => {
    await ServerModel.updateOne({ _id: G }, { $set: { "counting.current": 399, "counting.saves": 3 } });
    expect((await commitCount(G, 399, 400)).earnedSave).toBe(false);
  });
  it("uses a save before resetting, and acts once under races", async () => {
    await ServerModel.updateOne({ _id: G }, { $set: { "counting.current": 50, "counting.saves": 1 } });
    expect(await failCount(G, 50)).toBe("saved");
    expect(await failCount(G, 50)).toBe("reset");
    expect(await failCount(G, 50)).toBe("stale");
    expect(await getCountingState(G)).toMatchObject({ current: 0, saves: 0 });
  });
});

describe("reminders", () => {
  it("delivers each due reminder exactly once, oldest first", async () => {
    const past = new Date(Date.now() - 1000);
    await createReminder({ userId: U1, guildId: G, channelId: C, text: "b", dueAt: past });
    await createReminder({ userId: U1, guildId: null, channelId: null, text: "a", dueAt: new Date(Date.now() - 5000) });
    await createReminder({ userId: U1, guildId: null, channelId: null, text: "later", dueAt: new Date(Date.now() + 60_000) });
    const [x, y] = await Promise.all([claimDueReminders(), claimDueReminders()]);
    const all = [...x, ...y];
    expect(all.map((r) => r.text).sort()).toEqual(["a", "b"]);
    expect(await ReminderModel.countDocuments()).toBe(1);
  });
  it("limits pending reminders and only lets the owner cancel", async () => {
    const due = new Date(Date.now() + 60_000);
    for (let i = 0; i < 25; i++) await createReminder({ userId: U1, guildId: null, channelId: null, text: `r${i}`, dueAt: due });
    await expect(createReminder({ userId: U1, guildId: null, channelId: null, text: "x", dueAt: due })).rejects.toBeInstanceOf(
      ReminderLimitError,
    );
    const one = await ReminderModel.findOne({ userId: U1 }).lean();
    expect(await cancelReminder(U2, String(one?._id))).toBe(false);
    expect(await cancelReminder(U1, String(one?._id))).toBe(true);
    expect(await cancelReminder(U1, "not-an-object-id")).toBe(false);
  });
});

describe("auto-replies", () => {
  it("adds, updates, limits and removes", async () => {
    expect(await addRule(G, U1, "  Hello  ", "word", "hi!")).toBe("added");
    expect(await addRule(G, U1, "hello", "exact", "hey")).toBe("updated");
    expect(await getRules(G)).toEqual([{ trigger: "hello", match: "exact", response: "hey" }]);
    for (let i = 0; i < 24; i++) await addRule(G, U1, `t${i}`, "word", "x");
    expect(await addRule(G, U1, "one too many", "word", "x")).toBe("limit");
    expect(await removeRule(G, "HELLO")).toBe(true);
    expect(await AutoReplyModel.countDocuments({ guildId: G })).toBe(24);
  });
});

describe("confessions", () => {
  beforeEach(async () => {
    await updateSettings(G, "confessions", { channelId: C });
  });
  it("numbers confessions and never stores the user ID", async () => {
    const a = await beginConfession(SECRET, G, U1, 0);
    const b = await beginConfession(SECRET, G, U2, 0);
    expect(a).toEqual({ ok: true, number: 1 });
    expect(b).toEqual({ ok: true, number: 2 });
    const raw = JSON.stringify(await ConfessionModel.find().lean());
    expect(raw).not.toContain(U1);
    expect(raw).not.toContain(U2);
  });
  it("enforces the cooldown and blocks by confession number", async () => {
    // The cooldown is in-memory module state, so use clock values no other test uses.
    const t = 1e12;
    expect(await beginConfession(SECRET, G, U1, t)).toEqual({ ok: true, number: 1 });
    expect(await beginConfession(SECRET, G, U1, t + 1000)).toMatchObject({ ok: false, reason: "cooldown" });
    expect(await banConfessor(G, 1)).toBe("banned");
    expect(await beginConfession(SECRET, G, U1, t + 1e7)).toEqual({ ok: false, reason: "banned" });
    expect(await beginConfession(SECRET, G, U2, t + 1e7)).toMatchObject({ ok: true }); // others unaffected
    expect(await banConfessor(G, 99)).toBe("not-found");
  });
  it("releases the number if posting failed", async () => {
    const r = await beginConfession(SECRET, G, U1, 2e12); // clock value unused by other tests (in-memory cooldown)
    if (!r.ok) throw new Error("expected ok");
    await attachMessage(G, r.number, null);
    expect(await ConfessionModel.countDocuments()).toBe(0);
  });
  it("is disabled until a channel is set", async () => {
    await updateSettings(G2, "confessions", { channelId: null });
    expect(await beginConfession(SECRET, G2, U1, 0)).toEqual({ ok: false, reason: "disabled" });
  });
});

describe("starboard", () => {
  it("lets exactly one racing event claim the post", async () => {
    const results = await Promise.all([1, 2, 3, 4].map((n) => updateStars("900000000000000001", G, C, n)));
    expect(results.filter((r) => r.claim)).toHaveLength(1);
    expect(await StarboardModel.countDocuments()).toBe(1);
  });
});

describe("privacy cascades", () => {
  async function seedUserEverywhere() {
    await UserModel.create({ _id: U1, firstSeenAt: new Date(), lastSeenAt: new Date() });
    await MemberModel.create([
      { _id: `${G}:${U1}`, guildId: G, userId: U1, xp: 10 },
      { _id: `${G2}:${U1}`, guildId: G2, userId: U1, xp: 10 },
      { _id: `${G}:${U2}`, guildId: G, userId: U2, xp: 10 },
    ]);
    await createReminder({ userId: U1, guildId: G, channelId: C, text: "x", dueAt: new Date(Date.now() + 60_000) });
  }

  it("/remove deletes the profile, every server's member record, and reminders", async () => {
    await seedUserEverywhere();
    expect(await deleteAllUserData(U1)).toEqual({ profile: true, memberRecords: 2, reminders: 1 });
    expect(await UserModel.countDocuments({ _id: U1 })).toBe(0);
    expect(await MemberModel.countDocuments({ userId: U1 })).toBe(0);
    expect(await ReminderModel.countDocuments({ userId: U1 })).toBe(0);
    expect(await MemberModel.countDocuments({ userId: U2 })).toBe(1); // other users untouched
  });

  it("leaving a server deletes everything about that server only", async () => {
    await seedUserEverywhere();
    await addRule(G, U1, "hi", "word", "hello");
    await updateSettings(G, "confessions", { channelId: C });
    await beginConfession(SECRET, G, U2, 0);
    await updateStars("900000000000000002", G, C, 3);

    await deleteAllGuildData(G);

    expect(await ServerModel.countDocuments({ _id: G })).toBe(0);
    expect(await MemberModel.countDocuments({ guildId: G })).toBe(0);
    expect(await AutoReplyModel.countDocuments({ guildId: G })).toBe(0);
    expect(await ConfessionModel.countDocuments({ guildId: G })).toBe(0);
    expect(await StarboardModel.countDocuments({ guildId: G })).toBe(0);
    // A channel reminder in that server becomes a DM reminder rather than vanishing.
    expect(await ReminderModel.findOne({ userId: U1 }).lean()).toMatchObject({ guildId: null, channelId: null });
    expect(await ServerModel.countDocuments({ _id: G2 })).toBe(1);
    expect(await MemberModel.countDocuments({ guildId: G2 })).toBe(1);
  });
});

describe("audit log", () => {
  it("stores entries with a 90-day TTL index", async () => {
    await recordAudit({ guildId: G, actorId: U1, actorTag: "nate", source: "command", action: "/config", details: "x".repeat(5000) });
    const doc = await AuditModel.findOne().lean();
    expect(doc?.details).toHaveLength(1000);
    const indexes = await AuditModel.collection.indexes();
    expect(indexes.find((i) => i.expireAfterSeconds !== undefined)?.expireAfterSeconds).toBe(90 * 24 * 3600);
  });
});
