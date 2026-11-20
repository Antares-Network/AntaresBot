import type { Guild } from "discord.js";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ALL_MODELS, CaseModel, MemberModel, ServerModel, SuggestionModel, TicketModel } from "../src/lib/db/models/index.js";
import { clearBirthday, getBirthday, setBirthday, upcomingBirthdays } from "../src/lib/services/birthdays.js";
import { activeStrikes, createCase, getCase, listCases, setCaseActive, setCaseReason } from "../src/lib/services/cases.js";
import { adjustXp, awardXp, getRank } from "../src/lib/services/members.js";
import { deleteAllGuildData, deleteAllUserData } from "../src/lib/services/privacy.js";
import { nextSeq, syncServers } from "../src/lib/services/servers.js";
import { invalidateSettings } from "../src/lib/services/settings.js";
import { createSuggestion, getSuggestion, setSuggestionStatus, voteSuggestion } from "../src/lib/services/suggestions.js";
import { ticketChannelDeleted } from "../src/lib/services/tickets.js";
import { getPresenceConfig, updatePresenceConfig } from "../src/lib/services/presence.js";

const G = "788541416740487218";
const G2 = "775216104012120124";
const U1 = "603629606154666024";
const U2 = "736086156759924762";
const MOD = "761646965624274954";
const C = "800000000000000001";

let mongo: MongoMemoryServer;
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
  const db = mongoose.connection.db;
  if (!db) throw new Error("not connected");
  for (const c of await db.collections()) await c.deleteMany({});
  invalidateSettings(G);
  invalidateSettings(G2);
  await syncServers([fakeGuild(G), fakeGuild(G2)]);
});

describe("per-server sequences", () => {
  it("allocates unique numbers under concurrency, per server and per kind", async () => {
    const nums = await Promise.all(Array.from({ length: 25 }, () => nextSeq(G, "case")));
    expect(new Set(nums).size).toBe(25);
    expect(Math.max(...nums)).toBe(25);
    expect(await nextSeq(G2, "case")).toBe(1);
    expect(await nextSeq(G, "ticket")).toBe(1);
  });
});

describe("cases", () => {
  it("numbers, lists, pardons and edits cases", async () => {
    const a = await createCase({ guildId: G, userId: U2, moderatorId: MOD, type: "warn", reason: "spam" });
    const b = await createCase({ guildId: G, userId: U2, moderatorId: MOD, type: "automod", reason: "invites" });
    await createCase({ guildId: G, userId: U2, moderatorId: MOD, type: "timeout", reason: "escalation" });
    expect([a.number, b.number]).toEqual([1, 2]);
    expect(await activeStrikes(G, U2, 0)).toBe(2); // timeouts aren't strikes
    await setCaseActive(G, 1, false);
    expect(await activeStrikes(G, U2, 0)).toBe(1);
    await setCaseReason(G, 2, "x".repeat(900));
    expect((await getCase(G, 2))?.reason).toHaveLength(500);
    expect((await listCases(G, U2)).map((c) => c.number)).toEqual([3, 2, 1]);
  });
  it("ignores expired warnings for escalation", async () => {
    await CaseModel.create({ guildId: G, number: 99, userId: U2, moderatorId: MOD, type: "warn", createdAt: new Date(Date.now() - 40 * 86_400_000) });
    await createCase({ guildId: G, userId: U2, moderatorId: MOD, type: "warn", reason: "" });
    expect(await activeStrikes(G, U2, 30)).toBe(1);
    expect(await activeStrikes(G, U2, 0)).toBe(2);
  });
});

describe("XP adjustments", () => {
  it("gives, takes (never below 0), sets and multiplies", async () => {
    expect(await adjustXp(G, U1, { add: 300 })).toMatchObject({ xp: 300, level: 2, previousLevel: 0 });
    expect(await adjustXp(G, U1, { add: -1000 })).toMatchObject({ xp: 0, level: 0, previousLevel: 2 });
    expect(await adjustXp(G, U1, { set: 255 })).toMatchObject({ xp: 255, level: 2 });
    expect((await getRank(G, U1)).xp).toBe(255);
    const r = await awardXp(G, U2, 1_000_000, 3);
    expect(r?.xp).toBeGreaterThanOrEqual(45);
    expect(r?.xp).toBeLessThanOrEqual(75);
  });
});

describe("birthdays", () => {
  it("stores month/day per server and lists upcoming ones", async () => {
    await setBirthday(G, U1, 12, 25);
    await setBirthday(G, U2, 11, 20);
    await setBirthday(G2, U1, 1, 1);
    expect(await getBirthday(G, U1)).toEqual({ month: 12, day: 25 });
    const up = await upcomingBirthdays(G, "UTC", 10, new Date("2026-11-19T12:00:00Z"));
    expect(up.map((r) => [r.userId, r.inDays])).toEqual([
      [U2, 1],
      [U1, 36],
    ]);
    expect(await clearBirthday(G, U1)).toBe(true);
    expect(await getBirthday(G, U1)).toBeNull();
    expect(await getBirthday(G2, U1)).toEqual({ month: 1, day: 1 });
  });
});

describe("suggestions", () => {
  it("toggles and moves votes atomically, and locks when decided", async () => {
    const n = await createSuggestion(G, U1, C);
    const votes = await Promise.all([U1, U2, MOD].map((u) => voteSuggestion(G, n, u, "up")));
    expect(votes.every((v) => v?.mine === "up")).toBe(true);
    expect(await voteSuggestion(G, n, U2, "down")).toEqual({ up: 2, down: 1, mine: "down" });
    expect(await voteSuggestion(G, n, U2, "down")).toEqual({ up: 2, down: 0, mine: null }); // toggle off
    await setSuggestionStatus(G, n, "approved");
    expect(await voteSuggestion(G, n, U2, "up")).toBeNull();
    expect((await getSuggestion(G, n))?.up).toHaveLength(2);
  });
});

describe("privacy cascades for new data", () => {
  it("/remove clears birthdays, votes, authorship and tickets, but keeps moderation cases", async () => {
    await setBirthday(G, U1, 5, 5);
    const n = await createSuggestion(G, U1, C);
    await voteSuggestion(G, n, U1, "up");
    await voteSuggestion(G, n, U2, "up");
    await TicketModel.create({ guildId: G, number: 1, openerId: U1, channelId: C });
    await createCase({ guildId: G, userId: U1, moderatorId: MOD, type: "warn", reason: "x" });

    await deleteAllUserData(U1);

    expect(await MemberModel.countDocuments({ userId: U1 })).toBe(0);
    const s = await getSuggestion(G, n);
    expect(s?.authorId).toBeNull();
    expect(s?.up).toEqual([U2]);
    expect(await TicketModel.countDocuments({ openerId: U1 })).toBe(0);
    expect(await CaseModel.countDocuments({ userId: U1 })).toBe(1);
  });

  it("leaving a server deletes its cases, suggestions and tickets", async () => {
    await createCase({ guildId: G, userId: U2, moderatorId: MOD, type: "warn", reason: "" });
    await createSuggestion(G, U2, C);
    await TicketModel.create({ guildId: G, number: 1, openerId: U2, channelId: C });
    await createCase({ guildId: G2, userId: U2, moderatorId: MOD, type: "warn", reason: "" });

    await deleteAllGuildData(G);

    expect(await CaseModel.countDocuments({ guildId: G })).toBe(0);
    expect(await SuggestionModel.countDocuments({ guildId: G })).toBe(0);
    expect(await TicketModel.countDocuments({ guildId: G })).toBe(0);
    expect(await CaseModel.countDocuments({ guildId: G2 })).toBe(1);
  });

  it("a deleted ticket channel closes its ticket", async () => {
    await TicketModel.create({ guildId: G, number: 1, openerId: U2, channelId: C });
    await ticketChannelDeleted(C);
    expect((await TicketModel.findOne({ channelId: C }).lean())?.status).toBe("closed");
  });
});

describe("status rotation storage", () => {
  it("starts from the default, saves edits, survives concurrent edits and resets", async () => {
    const start = await getPresenceConfig();
    expect(start.isDefault).toBe(true);
    expect(start.rotation.length).toBeGreaterThan(0);

    await updatePresenceConfig(() => ({ rotation: [{ text: "a", type: "playing" }] }));
    await Promise.all(
      ["b", "c", "d"].map((t) => updatePresenceConfig((cur) => ({ rotation: [...cur.rotation, { text: t, type: "watching" as const }] }))),
    );
    const after = await getPresenceConfig();
    expect(after.isDefault).toBe(false);
    expect(after.rotation.map((e) => e.text).sort()).toEqual(["a", "b", "c", "d"]); // no lost updates

    await updatePresenceConfig(() => ({ pinned: { text: "maintenance", type: "custom" }, intervalSec: 60 }));
    expect(await getPresenceConfig()).toMatchObject({ pinned: { text: "maintenance" }, intervalSec: 60 });

    await expect(updatePresenceConfig(() => ({ intervalSec: 5 }))).rejects.toThrow(); // schema min 30
    await updatePresenceConfig(() => ({ rotation: null, intervalSec: 300, pinned: null }));
    expect(await getPresenceConfig()).toMatchObject({ isDefault: true, intervalSec: 300, pinned: null });
  });
});
