/**
 * Local security-scan sandbox for the dashboard: the real dashboard code (from dist/) with an
 * in-memory MongoDB, a fake Discord and fake data, listening on 127.0.0.1 only. It prints a
 * logged-in session cookie so a scanner (OWASP ZAP) can reach the pages behind login.
 *
 *   npm run scan:dashboard          (builds, then starts the sandbox on 127.0.0.1:8099)
 *
 * Then, in another terminal, an authenticated OWASP ZAP full scan (spider + active attacks),
 * with <cookie> = the "sid=..." value printed on the SANDBOX_COOKIE line:
 *
 *   docker run --rm -v "$PWD/zap:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:2.16.1 zap-full-scan.py \
 *     -t http://host.docker.internal:8099/ -m 3 -T 20 -I -j -r report.html -J report.json \
 *     -z "-config replacer.full_list(0).description=session -config replacer.full_list(0).enabled=true \
 *         -config replacer.full_list(0).matchtype=REQ_HEADER -config replacer.full_list(0).matchstr=Cookie \
 *         -config replacer.full_list(0).regex=false -config replacer.full_list(0).replacement=<cookie>"
 *
 * Any 500 in the sandbox's log during the scan is a bug, whatever ZAP labels it ("SQL Injection"
 * on a 500 means "a quote made the server error"). Reports are git-ignored (zap/ is not tracked).
 *
 * Never point a scanner at the real dashboard: an active scan submits thousands of forms.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { PermissionFlagsBits } from "discord.js";
import { buildApp } from "../dist/dashboard/server.js";
import { SessionStore } from "../dist/dashboard/session.js";
import { ALL_MODELS, ServerModel } from "../dist/lib/db/models/index.js";

const PORT = Number(process.env.SANDBOX_PORT) || 8099;
// What the scanner calls the sandbox (from inside Docker, the host is host.docker.internal).
const PUBLIC_URL = process.env.SANDBOX_PUBLIC_URL || `http://host.docker.internal:${PORT}`;

const G = "788541416740487218";
const OWNER = "603629606154666024";
const ADMIN = "736086156759924762";
const role = (id, name, position, perms) => ({ id, name, position, permissions: String(perms), managed: false, color: 0, hoist: false, mentionable: false, flags: 0 });
const guild = {
  id: G,
  name: `Sandbox <b>"server"</b>`,
  owner_id: OWNER,
  roles: [
    role(G, "@everyone", 0, 0n),
    role("900000000000000001", "Gamer", 1, PermissionFlagsBits.SendMessages),
    role("900000000000000002", "Mods", 3, PermissionFlagsBits.BanMembers),
    role("900000000000000003", "Antares Bot", 5, PermissionFlagsBits.ManageRoles),
  ],
};

const cfg = {
  NODE_ENV: "development",
  BOT_TOKEN: "x".repeat(60),
  BOT_MONGO_PATH: "mongodb://unused",
  BOT_OWNER_IDS: [OWNER],
  DISCORD_CLIENT_ID: "111111111111111111",
  DISCORD_CLIENT_SECRET: "s".repeat(32),
  DASHBOARD_PUBLIC_URL: PUBLIC_URL,
  DASHBOARD_SESSION_SECRET: "sandbox-only-secret-".repeat(3),
  DASHBOARD_PORT: PORT,
  DASHBOARD_TRUST_PROXY: false,
};

const bot = {
  manageContext: async (guildId, userId) =>
    guildId === G && (userId === ADMIN || userId === OWNER)
      ? {
          guild,
          channels: [{ id: "800000000000000001", name: "general" }],
          categories: [{ id: "800000000000000009", name: "Tickets" }],
          botRoleIds: ["900000000000000003"],
          actor: { id: userId, roleIds: userId === ADMIN ? ["900000000000000002"] : [], isOwner: userId === OWNER },
        }
      : null,
  postEmbed: async () => undefined,
};
// Real logins are never needed: the scanner uses the printed session cookie.
const oauth = {
  authorizeUrl: (state) => `https://discord.com/oauth2/authorize?state=${state}`,
  login: async () => {
    throw new Error("OAuth is disabled in the sandbox");
  },
};

const mongo = await MongoMemoryServer.create();
mongoose.set("strictQuery", true);
mongoose.set("sanitizeFilter", true);
await mongoose.connect(mongo.getUri("antaresbot"));
await Promise.all(ALL_MODELS.map((m) => m.createIndexes()));
await ServerModel.create({ _id: G, name: guild.name, joinedAt: new Date() });

const sessions = new SessionStore();
// The scanner's session survives the logout form, so a spider that submits it keeps scanning.
const destroy = sessions.destroy.bind(sessions);
let scannerSession = "";
sessions.destroy = (id) => (id === scannerSession ? undefined : destroy(id));

const user = process.argv.includes("--owner") ? OWNER : ADMIN;
const s = sessions.create({ userId: user, username: user === OWNER ? "owner" : "admin", avatarUrl: null, guildIds: [G] });
scannerSession = s.id;

const app = await buildApp({ cfg, sessions, oauth, bot }, { rateLimit: false });
await app.listen({ host: "127.0.0.1", port: PORT });

console.log(`SANDBOX_READY http://127.0.0.1:${PORT} (scanner URL ${PUBLIC_URL})`);
console.log(`SANDBOX_COOKIE sid=${app.signCookie(s.id)}`);

const stop = async () => {
  await app.close();
  await mongoose.disconnect();
  await mongo.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
