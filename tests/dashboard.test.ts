import { PermissionFlagsBits, type APIGuild, type APIRole } from "discord.js";
import type { FastifyInstance } from "fastify";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DashboardConfig } from "../src/dashboard/config.js";
import { canManage, memberPermissions, restRoleProblem, type BotApi, type GuildContext } from "../src/dashboard/discord.js";
import { escapeHtml, html } from "../src/dashboard/html.js";
import { buildApp } from "../src/dashboard/server.js";
import { SessionStore } from "../src/dashboard/session.js";
import { ALL_MODELS, AuditModel, GateEntryModel, ServerModel } from "../src/lib/db/models/index.js";
import { getFeatureSettings, invalidateSettings } from "../src/lib/services/settings.js";

const G = "788541416740487218";
const OWNER = "603629606154666024";
const ADMIN = "736086156759924762";
const PUBLIC_URL = "https://bot.example.com";

const role = (id: string, name: string, position: number, perms: bigint, managed = false): APIRole =>
  ({ id, name, position, permissions: perms.toString(), managed, color: 0, hoist: false, mentionable: false, flags: 0 }) as unknown as APIRole;

const SAFE_ROLE = "900000000000000001";
const ADMIN_ROLE = "900000000000000002";
const BOT_ROLE = "900000000000000003";
const guild = {
  id: G,
  name: `<script>alert("x")</script> Server`,
  owner_id: OWNER,
  roles: [
    role(G, "@everyone", 0, 0n),
    role(SAFE_ROLE, "Gamer", 1, PermissionFlagsBits.SendMessages),
    role(ADMIN_ROLE, "Mods", 3, PermissionFlagsBits.BanMembers),
    role(BOT_ROLE, "Antares Bot", 5, PermissionFlagsBits.ManageRoles),
  ],
} as unknown as APIGuild;

const cfg: DashboardConfig = {
  NODE_ENV: "test",
  BOT_TOKEN: "x".repeat(60),
  BOT_MONGO_PATH: "mongodb://unused",
  BOT_OWNER_IDS: [OWNER],
  DISCORD_CLIENT_ID: "111111111111111111",
  DISCORD_CLIENT_SECRET: "s".repeat(32),
  DASHBOARD_PUBLIC_URL: PUBLIC_URL,
  DASHBOARD_SESSION_SECRET: "k".repeat(48),
  DASHBOARD_PORT: 8080,
  DASHBOARD_TRUST_PROXY: false,
};

/** Fake Discord: ADMIN can manage G until `revoked`; the owner always can. */
let revoked = false;
const posted: unknown[] = [];
const bot: BotApi = {
  manageContext(guildId, userId): Promise<GuildContext | null> {
    if (guildId !== G) return Promise.resolve(null);
    if (userId !== OWNER && (userId !== ADMIN || revoked)) return Promise.resolve(null);
    return Promise.resolve({
      guild,
      channels: [{ id: "800000000000000001", name: "general" }],
      botRoleIds: [BOT_ROLE],
      actor: { id: userId, roleIds: userId === ADMIN ? [ADMIN_ROLE] : [], isOwner: userId === OWNER },
    });
  },
  postEmbed(_c, e) {
    posted.push(e);
    return Promise.resolve();
  },
};

let loginAs = ADMIN;
const oauth = {
  authorizeUrl: (state: string) => `https://discord.com/oauth2/authorize?state=${state}`,
  login: () =>
    Promise.resolve({ user: { id: loginAs, username: loginAs === OWNER ? "owner" : "admin", avatarUrl: null }, manageableGuildIds: [G] }),
};

let mongo: MongoMemoryServer;
let app: FastifyInstance;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  mongoose.set("strictQuery", true);
  mongoose.set("sanitizeFilter", true);
  await mongoose.connect(mongo.getUri("antaresbot"));
  await Promise.all(ALL_MODELS.map((m) => (m as typeof ServerModel).createIndexes()));
  app = await buildApp({ cfg, sessions: new SessionStore(), oauth, bot });
}, 180_000);

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  const db = mongoose.connection.db;
  if (!db) throw new Error("not connected");
  for (const c of await db.collections()) await c.deleteMany({});
  await ServerModel.create({ _id: G, name: guild.name, joinedAt: new Date() });
  invalidateSettings(G);
  revoked = false;
  loginAs = ADMIN;
  posted.length = 0;
});

const cookieHeader = (res: { cookies: { name: string; value: string }[] }) => res.cookies.map((c) => `${c.name}=${c.value}`).join("; ");

let loginIp = 0;
/** Full OAuth round-trip through the real routes; returns the session cookie header. */
async function login(as = ADMIN): Promise<string> {
  loginAs = as;
  // Each login from its own address, so the login rate limit (10/min/IP) doesn't trip the suite.
  const remoteAddress = `10.1.${Math.floor(++loginIp / 250)}.${loginIp % 250}`;
  const start = await app.inject({ method: "GET", url: "/login", remoteAddress });
  const state = new URL(String(start.headers.location)).searchParams.get("state") ?? "";
  const cb = await app.inject({
    method: "GET",
    url: `/auth/callback?code=abc&state=${state}`,
    headers: { cookie: cookieHeader(start) },
    remoteAddress,
  });
  expect(cb.statusCode).toBe(303);
  return cookieHeader(cb);
}

async function csrfFor(cookie: string): Promise<string> {
  const res = await app.inject({ method: "GET", url: `/g/${G}`, headers: { cookie } });
  const m = /name="_csrf" value="([^"]+)"/.exec(res.body);
  if (!m?.[1]) throw new Error("no csrf token on page");
  return m[1];
}

const form = (o: Record<string, string | string[]>) =>
  Object.entries(o)
    .flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map((x) => `${encodeURIComponent(k)}=${encodeURIComponent(x)}`))
    .join("&");

const post = (url: string, cookie: string, body: Record<string, string | string[]>, origin = PUBLIC_URL, remoteAddress = "127.0.0.1") =>
  app.inject({
    method: "POST",
    url,
    headers: { cookie, origin, "content-type": "application/x-www-form-urlencoded" },
    payload: form(body),
    remoteAddress,
  });
/** A fresh client address per call, for tests that send more requests than the rate limit allows. */
let clientIp = 0;
const freshIp = () => `10.2.${Math.floor(++clientIp / 250) % 250}.${clientIp % 250}`;

describe("pure helpers", () => {
  it("escapes HTML in every interpolation", () => {
    expect(escapeHtml(`<a href="x">'&\``)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#96;");
    expect(html`<p>${"<b>"}</p>`.value).toBe("<p>&lt;b&gt;</p>");
  });
  it("computes manage permission from roles", () => {
    expect(canManage({ isOwner: false, permissions: PermissionFlagsBits.ManageGuild })).toBe(true);
    expect(canManage({ isOwner: false, permissions: PermissionFlagsBits.BanMembers })).toBe(false);
    expect(canManage({ isOwner: true, permissions: 0n })).toBe(true);
    expect(memberPermissions(guild, [SAFE_ROLE])).toBe(PermissionFlagsBits.SendMessages);
  });
  it("applies the same role-escalation rules as the bot", () => {
    const r = (id: string) => guild.roles.find((x) => x.id === id) as APIRole;
    const actor = { id: ADMIN, roleIds: [ADMIN_ROLE] };
    expect(restRoleProblem(guild, r(SAFE_ROLE), [BOT_ROLE], actor)).toBeNull();
    expect(restRoleProblem(guild, r(ADMIN_ROLE), [BOT_ROLE], actor)).toMatch(/moderator\/admin/);
    expect(restRoleProblem(guild, r(G), [BOT_ROLE], actor)).toMatch(/@everyone/);
    expect(restRoleProblem(guild, r(SAFE_ROLE), [], actor)).toMatch(/above the bot/);
  });
});

describe("dashboard HTTP", () => {
  it("sends strict security headers", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers["strict-transport-security"]).toBeDefined();
    expect(res.body).toContain("Log in with Discord");
  });

  it("rejects an OAuth callback with a wrong or missing state", async () => {
    const start = await app.inject({ method: "GET", url: "/login" });
    const bad = await app.inject({ method: "GET", url: "/auth/callback?code=abc&state=forged", headers: { cookie: cookieHeader(start) } });
    expect(bad.statusCode).toBe(400);
    const none = await app.inject({ method: "GET", url: "/auth/callback?code=abc&state=x" });
    expect(none.statusCode).toBe(400);
  });

  it("sets a hardened session cookie and lists manageable servers (escaped)", async () => {
    loginAs = ADMIN;
    const start = await app.inject({ method: "GET", url: "/login" });
    const state = new URL(String(start.headers.location)).searchParams.get("state") ?? "";
    const cb = await app.inject({ method: "GET", url: `/auth/callback?code=abc&state=${state}`, headers: { cookie: cookieHeader(start) } });
    const sid = cb.cookies.find((c) => c.name === "sid");
    expect(sid).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax" });
    const home = await app.inject({ method: "GET", url: "/", headers: { cookie: cookieHeader(cb) } });
    expect(home.body).toContain("&lt;script&gt;");
    expect(home.body).not.toContain("<script>alert");
  });

  it("treats a tampered session cookie as logged out", async () => {
    const res = await app.inject({ method: "GET", url: `/g/${G}`, headers: { cookie: "sid=forged.signature" } });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/login");
  });

  it("saves settings only with a valid CSRF token and same-origin request", async () => {
    const cookie = await login();
    const csrf = await csrfFor(cookie);
    const body = { _csrf: csrf, enabled: "on", announce: "dm", announceChannelId: "", rewardLevel: "", rewardRole: "" };

    expect((await post(`/g/${G}/levels`, cookie, { ...body, _csrf: "wrong" })).statusCode).toBe(403);
    expect((await post(`/g/${G}/levels`, cookie, body, "https://evil.example")).statusCode).toBe(403);
    expect((await getFeatureSettings(G)).levels.enabled).toBe(false);

    const ok = await post(`/g/${G}/levels`, cookie, body);
    expect(ok.statusCode).toBe(303);
    invalidateSettings(G);
    expect((await getFeatureSettings(G)).levels).toMatchObject({ enabled: true, announce: "dm" });
    expect(await AuditModel.countDocuments({ source: "dashboard", action: "settings.levels" })).toBe(1);
  });

  it("refuses roles that would escalate privileges", async () => {
    const cookie = await login();
    const csrf = await csrfFor(cookie);
    await post(`/g/${G}/welcome`, cookie, { _csrf: csrf, autoRoleIds: [ADMIN_ROLE], message: "hi", dmMessage: "hi", leaveMessage: "bye" });
    invalidateSettings(G);
    expect((await getFeatureSettings(G)).welcome.autoRoleIds).toEqual([]);
    const page = await app.inject({ method: "GET", url: `/g/${G}`, headers: { cookie } });
    expect(page.body).toContain("moderator/admin");

    await post(`/g/${G}/welcome`, cookie, { _csrf: csrf, autoRoleIds: [SAFE_ROLE], message: "hi", dmMessage: "hi", leaveMessage: "bye" });
    invalidateSettings(G);
    expect((await getFeatureSettings(G)).welcome.autoRoleIds).toEqual([SAFE_ROLE]);
  });

  it("ignores channel IDs from other servers", async () => {
    const cookie = await login();
    const csrf = await csrfFor(cookie);
    await post(`/g/${G}/starboard`, cookie, { _csrf: csrf, channelId: "899999999999999999", threshold: "3" });
    invalidateSettings(G);
    expect((await getFeatureSettings(G)).starboard.channelId).toBeNull();
  });

  it("re-checks permissions live: losing Manage Server revokes access immediately", async () => {
    const cookie = await login();
    const csrf = await csrfFor(cookie);
    revoked = true;
    expect((await app.inject({ method: "GET", url: `/g/${G}`, headers: { cookie } })).statusCode).toBe(403);
    expect((await post(`/g/${G}/linkPreviews`, cookie, { _csrf: csrf, enabled: "on" })).statusCode).toBe(403);
  });

  it("hides the owner panel from non-owners and lets the owner manage bans", async () => {
    const admin = await login(ADMIN);
    expect((await app.inject({ method: "GET", url: "/owner", headers: { cookie: admin } })).statusCode).toBe(404);

    const owner = await login(OWNER);
    const page = await app.inject({ method: "GET", url: "/owner", headers: { cookie: owner } });
    expect(page.statusCode).toBe(200);
    const csrf = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? "";
    await post("/owner/gate", owner, { _csrf: csrf, kind: "user", targetId: ADMIN, op: "add" });
    expect(await GateEntryModel.countDocuments({ _id: `user:${ADMIN}` })).toBe(1);
    await post("/owner/gate", owner, { _csrf: csrf, kind: "user", targetId: OWNER, op: "add" });
    expect(await GateEntryModel.countDocuments({ _id: `user:${OWNER}` })).toBe(0); // can't ban an owner
  });
});

describe("dashboard security (attack scenarios)", () => {
  const G2 = "775216104012120124"; // a server the bot is in, but the attacker can't manage

  it("refuses another server's pages, saves and audit log", async () => {
    await ServerModel.create({ _id: G2, name: "Victim", joinedAt: new Date() });
    const cookie = await login(ADMIN);
    const csrf = await csrfFor(cookie);
    expect((await app.inject({ method: "GET", url: `/g/${G2}`, headers: { cookie } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: `/g/${G2}/audit`, headers: { cookie } })).statusCode).toBe(403);
    expect((await post(`/g/${G2}/linkPreviews`, cookie, { _csrf: csrf, enabled: "on" })).statusCode).toBe(403);
    invalidateSettings(G2);
    expect((await getFeatureSettings(G2)).linkPreviews.enabled).toBe(false);
  });

  it("changes nothing for logged-out requests", async () => {
    const res = await post(`/g/${G}/linkPreviews`, "", { enabled: "on" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/login");
    invalidateSettings(G);
    expect((await getFeatureSettings(G)).linkPreviews.enabled).toBe(false);
  });

  it("ties CSRF tokens to the session and rejects an opaque origin", async () => {
    const admin = await login(ADMIN);
    const adminCsrf = await csrfFor(admin);
    const owner = await login(OWNER);
    expect((await post(`/g/${G}/linkPreviews`, owner, { _csrf: adminCsrf, enabled: "on" })).statusCode).toBe(403);
    expect((await post(`/g/${G}/linkPreviews`, admin, { _csrf: adminCsrf, enabled: "on" }, "null")).statusCode).toBe(403);
    // No Origin header at all (a non-browser client) still needs the session's own token.
    const noOrigin = await app.inject({
      method: "POST",
      url: `/g/${G}/linkPreviews`,
      headers: { cookie: admin, "content-type": "application/x-www-form-urlencoded" },
      payload: form({ _csrf: adminCsrf, enabled: "on" }),
    });
    expect(noOrigin.statusCode).toBe(303);
  });

  it("logging out ends the session on the server, and can't be forced cross-site", async () => {
    const cookie = await login(ADMIN);
    const csrf = await csrfFor(cookie);
    await post("/logout", cookie, { _csrf: "wrong" }); // forged logout: ignored
    expect((await app.inject({ method: "GET", url: `/g/${G}`, headers: { cookie } })).statusCode).toBe(200);
    await post("/logout", cookie, { _csrf: csrf });
    // The old cookie is dead even if the browser (or an attacker) kept a copy.
    expect((await app.inject({ method: "GET", url: `/g/${G}`, headers: { cookie } })).statusCode).toBe(302);
    expect((await post(`/g/${G}/linkPreviews`, cookie, { _csrf: csrf, enabled: "on" })).statusCode).toBe(302);
  });

  it("only real settings sections can be posted to", async () => {
    const cookie = await login(ADMIN);
    const csrf = await csrfFor(cookie);
    for (const section of ["__proto__", "constructor", "toString", "settingsRev", "..%2Flevels", "levels%00"]) {
      expect((await post(`/g/${G}/${section}`, cookie, { _csrf: csrf })).statusCode, section).toBe(404);
    }
    // Owner-only feature: refused through the form even for a server admin.
    await post(`/g/${G}/mcStatus`, cookie, { _csrf: csrf, channelId: "800000000000000001", address: "10.0.0.1" });
    invalidateSettings(G);
    expect((await getFeatureSettings(G)).mcStatus.address).toBeNull();
  });

  it("refuses oversized and non-form bodies without a server error", async () => {
    const cookie = await login(ADMIN);
    const csrf = await csrfFor(cookie);
    const big = await post(`/g/${G}/welcome`, cookie, { _csrf: csrf, message: "x".repeat(70_000) });
    expect(big.statusCode).toBe(413);
    const json = await app.inject({
      method: "POST",
      url: `/g/${G}/general`,
      headers: { cookie, origin: PUBLIC_URL, "content-type": "application/json" },
      payload: JSON.stringify({ _csrf: csrf, timezone: { toString: 1 } }),
    });
    expect(json.statusCode).toBeLessThan(500);
    expect(json.body).not.toMatch(/at .+\.js:\d+|TypeError|stack/i);
  });

  it("answers a burst of simultaneous saves without a server error (found by OWASP ZAP)", async () => {
    const cookie = await login(ADMIN);
    const csrf = await csrfFor(cookie);
    const results = await Promise.all(
      Array.from({ length: 80 }, (_, i) =>
        post(`/g/${G}/modlog`, cookie, { _csrf: csrf, channelId: "800000000000000001", ...(i % 2 ? { edits: "on" } : {}) }, PUBLIC_URL, freshIp()),
      ),
    );
    expect(results.map((r) => r.statusCode).filter((c) => c !== 303)).toEqual([]);
  });

  it("rate-limits login attempts", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await app.inject({ method: "GET", url: "/login", remoteAddress: "203.0.113.77" })).statusCode);
    }
    expect(statuses.slice(0, 10).every((c) => c === 302)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});
