import { createServer, type Server } from "node:net";
import { ActivityType } from "discord.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { birthdaysOn, daysUntil, isValidBirthday, localDate } from "../src/lib/features/birthdays.js";
import { MAX_XP_MULTIPLIER, xpMultiplierFor } from "../src/lib/features/levels.js";
import {
  encodeVarInt,
  flattenChat,
  isPublicIp,
  parseAddress,
  parseStatus,
  readStatusResponse,
  readVarInt,
} from "../src/lib/features/mcping.js";
import { moderationProblem, shouldEscalate, warningCutoff } from "../src/lib/features/moderation.js";
import { McPingError, pingMinecraft } from "../src/lib/services/mcStatus.js";
import { statusChannelName } from "../src/lib/services/mcStatusChannels.js";
import { parseSettings } from "../src/lib/services/settings.js";
import { moveItem, renderStatus, shortUptime, unknownPlaceholders } from "../src/lib/features/presence.js";
import { toActivity } from "../src/lib/services/presence.js";

describe("moderation rules", () => {
  it("escalates on every Nth active warning", () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => shouldEscalate(n, 3))).toEqual([false, false, true, false, false, true]);
    expect(shouldEscalate(3, 0)).toBe(false);
  });
  it("computes the expiry cutoff", () => {
    expect(warningCutoff(0)).toBeNull();
    expect(warningCutoff(1, 86_400_000 * 10)?.getTime()).toBe(86_400_000 * 9);
  });
  it("enforces role hierarchy", () => {
    const base = { actorId: "1", targetId: "2", ownerId: "9", targetIsBot: false, actorTop: 5, targetTop: 3 };
    expect(moderationProblem(base)).toBeNull();
    expect(moderationProblem({ ...base, targetTop: 5 })).toMatch(/not below/);
    expect(moderationProblem({ ...base, actorId: "9", targetTop: 50 })).toBeNull(); // owner outranks everyone
    expect(moderationProblem({ ...base, targetId: "9" })).toMatch(/owner/);
    expect(moderationProblem({ ...base, targetId: "1" })).toMatch(/yourself/);
    expect(moderationProblem({ ...base, targetIsBot: true })).toMatch(/bot/);
    expect(moderationProblem({ ...base, targetTop: null })).toBeNull(); // not in the server
  });
});

describe("XP controls", () => {
  const cfg = {
    noXpChannelIds: ["100"],
    noXpRoleIds: ["200"],
    roleMultipliers: [
      { roleId: "300", multiplier: 2 },
      { roleId: "301", multiplier: 1.5 },
      { roleId: "302", multiplier: 0.5 },
    ],
    channelMultipliers: [
      { channelId: "400", multiplier: 3 },
      { channelId: "401", multiplier: 2 },
    ],
  };
  const ctx = { channelId: "1", parentId: null, categoryId: null, roleIds: [] as string[] };
  it("blocks no-XP channels, their threads and categories, and no-XP roles", () => {
    expect(xpMultiplierFor(cfg, { ...ctx, channelId: "100" })).toBe(0);
    expect(xpMultiplierFor(cfg, { ...ctx, parentId: "100" })).toBe(0);
    expect(xpMultiplierFor(cfg, { ...ctx, categoryId: "100" })).toBe(0);
    expect(xpMultiplierFor(cfg, { ...ctx, roleIds: ["300", "200"] })).toBe(0);
  });
  it("uses the best role multiplier times the most specific channel multiplier", () => {
    expect(xpMultiplierFor(cfg, ctx)).toBe(1);
    expect(xpMultiplierFor(cfg, { ...ctx, roleIds: ["301", "300"] })).toBe(2);
    expect(xpMultiplierFor(cfg, { ...ctx, roleIds: ["302"] })).toBe(0.5);
    expect(xpMultiplierFor(cfg, { ...ctx, channelId: "401", categoryId: "400" })).toBe(2);
    expect(xpMultiplierFor(cfg, { ...ctx, categoryId: "400", roleIds: ["300"] })).toBe(6);
    expect(xpMultiplierFor({ ...cfg, roleMultipliers: [{ roleId: "9", multiplier: 5 }] }, { ...ctx, channelId: "400", roleIds: ["9"] })).toBe(
      MAX_XP_MULTIPLIER,
    );
  });
});

describe("birthdays", () => {
  it("validates month/day, allowing 29 Feb", () => {
    expect(isValidBirthday(2, 29)).toBe(true);
    expect(isValidBirthday(2, 30)).toBe(false);
    expect(isValidBirthday(4, 31)).toBe(false);
    expect(isValidBirthday(13, 1)).toBe(false);
  });
  it("celebrates 29 Feb on 28 Feb in non-leap years only", () => {
    expect(birthdaysOn({ year: 2027, month: 2, day: 28 })).toEqual([
      { month: 2, day: 28 },
      { month: 2, day: 29 },
    ]);
    expect(birthdaysOn({ year: 2028, month: 2, day: 28 })).toEqual([{ month: 2, day: 28 }]);
  });
  it("counts days until the next birthday", () => {
    const today = { year: 2026, month: 12, day: 30 };
    expect(daysUntil(today, 12, 30)).toBe(0);
    expect(daysUntil(today, 1, 1)).toBe(2);
    expect(daysUntil({ year: 2027, month: 3, day: 1 }, 2, 28)).toBe(364);
  });
  it("reads the local date in a time zone", () => {
    const t = new Date("2026-11-19T03:30:00Z");
    expect(localDate(t, "UTC")).toEqual({ year: 2026, month: 11, day: 19, hour: 3 });
    expect(localDate(t, "America/Chicago")).toEqual({ year: 2026, month: 11, day: 18, hour: 21 });
  });
  it("rejects unknown time zones in settings", () => {
    expect(parseSettings({ birthdays: { timezone: "Mars/Olympus" } }).birthdays.timezone).toBe("UTC");
    expect(parseSettings({ birthdays: { timezone: "Europe/London" } }).birthdays.timezone).toBe("Europe/London");
  });
});

describe("Minecraft ping protocol", () => {
  it("round-trips VarInts", () => {
    for (const n of [0, 1, 127, 128, 255, 25565, 2_097_151, 2_147_483_647, -1]) {
      expect(readVarInt(encodeVarInt(n))?.value).toBe(n);
    }
    expect(readVarInt(Buffer.from([0x80]))).toBeNull(); // incomplete
    expect(() => readVarInt(Buffer.from([0x80, 0x80, 0x80, 0x80, 0x80, 0x01]))).toThrow();
  });
  it("parses addresses", () => {
    expect(parseAddress("Play.Example.com")).toEqual({ host: "play.example.com", port: null });
    expect(parseAddress("play.example.com:25566")).toEqual({ host: "play.example.com", port: 25566 });
    expect(parseAddress("1.2.3.4:25565")).toEqual({ host: "1.2.3.4", port: 25565 });
    for (const bad of ["", "a b", "x:99999", "x:0", "-bad.com", "http://x.com", "[::1]:25565", "host:port"]) expect(parseAddress(bad)).toBeNull();
  });
  it("blocks private and special addresses", () => {
    for (const ip of ["127.0.0.1", "10.3.5.75", "192.168.1.1", "172.20.0.1", "169.254.1.1", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) {
      expect(isPublicIp(ip), ip).toBe(false);
    }
    for (const ip of ["1.1.1.1", "1.1.1.1", "2606:4700::1111"]) expect(isPublicIp(ip), ip).toBe(true);
    expect(isPublicIp("not-an-ip")).toBe(false);
  });
  it("reads a status response, possibly split across packets", () => {
    const json = JSON.stringify({ players: { online: 2, max: 20, sample: [{ name: "nyxtrash" }, { name: "§cBuy ranks!" }] }, version: { name: "Velocity 3" }, description: { text: "§aHi ", extra: ["there"] } });
    const str = Buffer.from(json);
    const body = Buffer.concat([encodeVarInt(0), encodeVarInt(str.length), str]);
    const pkt = Buffer.concat([encodeVarInt(body.length), body]);
    expect(readStatusResponse(pkt.subarray(0, 10))).toBeNull();
    const s = parseStatus(readStatusResponse(pkt) ?? "");
    expect(s).toEqual({ online: 2, max: 20, version: "Velocity 3", motd: "Hi there", players: ["nyxtrash"] });
    expect(() => readStatusResponse(Buffer.concat([encodeVarInt(5_000_000)]))).toThrow();
  });
  it("flattens chat components", () => {
    expect(flattenChat({ text: "a", extra: [{ text: "b", extra: ["c"] }, "§ld"] })).toBe("abcd");
  });
  it("names status channels", () => {
    expect(statusChannelName("Bergshire", { online: 3, max: 20 })).toBe("🟢 Bergshire: 3/20 online");
    expect(statusChannelName("Bergshire", null)).toBe("🔴 Bergshire: offline");
  });
});

describe("pingMinecraft against a fake server", () => {
  let server: Server;
  let port = 0;
  beforeAll(async () => {
    server = createServer((sock) => {
      sock.once("data", () => {
        const str = Buffer.from(JSON.stringify({ players: { online: 1, max: 10, sample: [{ name: "Notch" }] }, version: { name: "1.21" }, description: "Test" }));
        const body = Buffer.concat([encodeVarInt(0), encodeVarInt(str.length), str]);
        // Send in two chunks to exercise reassembly.
        const pkt = Buffer.concat([encodeVarInt(body.length), body]);
        sock.write(pkt.subarray(0, 5));
        setTimeout(() => sock.end(pkt.subarray(5)), 20);
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const addr = server.address();
    port = typeof addr === "object" && addr ? addr.port : 0;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => { r(); })));

  it("refuses private addresses for ordinary users", async () => {
    await expect(pingMinecraft(`127.0.0.1:${port}`)).rejects.toBeInstanceOf(McPingError);
  });
  it("pings when private addresses are allowed (owner status channels)", async () => {
    const s = await pingMinecraft(`127.0.0.1:${port}`, { allowPrivate: true });
    expect(s).toMatchObject({ online: 1, max: 10, version: "1.21", motd: "Test", players: ["Notch"] });
  });
});

describe("status rotation", () => {
  const vars = { servers: 1234, users: 56789, messages: 10, uptimeMs: 3 * 86_400_000 + 4 * 3_600_000, pingMs: 42.4, version: "2.0.0", commands: 61 };
  it("renders placeholders and leaves unknown text alone", () => {
    expect(renderStatus("/help | {servers} servers, {users} users", vars)).toBe("/help | 1,234 servers, 56,789 users");
    expect(renderStatus("up {uptime} · {ping} · v{version} · {commands} cmds · {nope}", vars)).toBe("up 3d 4h · 42ms · v2.0.0 · 61 cmds · {nope}");
    expect(renderStatus("{ping}", { ...vars, pingMs: -1 })).toBe("…");
    expect(renderStatus("x".repeat(200), vars)).toHaveLength(128);
  });
  it("flags unknown placeholders", () => {
    expect(unknownPlaceholders("{servers} {severs} {Users}")).toEqual(["severs", "Users"]);
  });
  it("formats uptime compactly", () => {
    expect([0, 59_000, 61 * 60_000, 25 * 3_600_000].map(shortUptime)).toEqual(["0m", "0m", "1h 1m", "1d 1h"]);
  });
  it("moves items", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(["a", "b"], 0, 99)).toEqual(["b", "a"]);
  });
  it("maps custom statuses to Discord's custom activity", () => {
    expect(toActivity({ text: "{servers} servers", type: "custom" }, vars)).toEqual({ type: ActivityType.Custom, name: "Custom Status", state: "1,234 servers" });
    expect(toActivity({ text: "you", type: "watching" }, vars)).toEqual({ type: ActivityType.Watching, name: "you" });
  });
});
