import { randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import mongoose from "mongoose";
import { GateEntryModel, gateEntryId, GATE_KINDS, ServerModel, type GateKind } from "../lib/db/models.js";
import { recentAudit, recordAudit } from "../lib/services/audit.js";
import { getFeatureSettings, SettingsValidationError, updateSettings, type SectionName, type ServerSettings } from "../lib/services/settings.js";
import { getBotStats } from "../lib/services/stats.js";
import { formatInZone, TIME_ZONES, utcOffset } from "../lib/features/timezones.js";
import type { DashboardConfig } from "./config.js";
import type { BotApi, DiscordOAuth, GuildContext } from "./discord.js";
import { restRoleProblem } from "./discord.js";
import { html, layout, STYLE, type SafeHtml } from "./html.js";
import { csrfMatches, SESSION_TTL_MS, type Session, type SessionStore } from "./session.js";

type Form = Record<string, string | string[] | undefined>;

export interface Deps {
  cfg: DashboardConfig;
  sessions: SessionStore;
  oauth: Pick<DiscordOAuth, "authorizeUrl" | "login">;
  bot: BotApi;
}

const SID = "sid";
const STATE = "oauth_state";

// ---------------------------------------------------------------------------
// Form helpers. Everything submitted is untrusted: IDs are checked against the guild.
// ---------------------------------------------------------------------------
const one = (f: Form, k: string): string => {
  const v = f[k];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};
const many = (f: Form, k: string): string[] => {
  const v = f[k];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
};
const checked = (f: Form, k: string) => one(f, k) === "on";
const int = (f: Form, k: string) => Number.parseInt(one(f, k), 10);

function channelOrNull(ctx: GuildContext, id: string): string | null {
  return ctx.channels.some((c) => c.id === id) ? id : null;
}
function categoryOrNull(ctx: GuildContext, id: string): string | null {
  return (ctx.categories ?? []).some((c) => c.id === id) ? id : null;
}
/** Parallel <select name=idKey> / <input name=valueKey> pairs -> validated multipliers (1 = remove). */
function multipliers(f: Form, idKey: string, valueKey: string, valid: (id: string) => boolean): { id: string; multiplier: number }[] {
  const ids = many(f, idKey);
  const values = many(f, valueKey);
  const out = new Map<string, number>();
  ids.forEach((id, i) => {
    const m = Math.round(Number.parseFloat(values[i] ?? "") * 10) / 10;
    if (id && valid(id) && Number.isFinite(m) && m !== 1) out.set(id, m);
  });
  return [...out].map(([id, multiplier]) => ({ id, multiplier }));
}

class FormError extends Error {}

function rolesChecked(ctx: GuildContext, ids: string[], escalationCheck: boolean): string[] {
  const out: string[] = [];
  for (const id of new Set(ids)) {
    const role = ctx.guild.roles.find((r) => r.id === id);
    if (!role) throw new FormError("Unknown role.");
    if (escalationCheck) {
      const problem = restRoleProblem(ctx.guild, role, ctx.botRoleIds, ctx.actor);
      if (problem) throw new FormError(problem);
    }
    out.push(id);
  }
  return out;
}

/** Turn a submitted form into a validated-on-save settings patch for one section. */
export function buildPatch(section: SectionName, f: Form, ctx: GuildContext, current: ServerSettings): Partial<ServerSettings[SectionName]> {
  switch (section) {
    case "general":
      return { timezone: one(f, "timezone").trim() || "UTC" };
    case "levels": {
      const keep = current.levels.roleRewards.filter((r) => !many(f, "removeReward").includes(String(r.level)));
      const addLevel = int(f, "rewardLevel");
      const addRole = one(f, "rewardRole");
      if (addRole && Number.isFinite(addLevel)) {
        const [roleId] = rolesChecked(ctx, [addRole], true);
        keep.push({ level: addLevel, roleId: roleId as string });
      }
      const dedup = [...new Map(keep.map((r) => [r.level, r])).values()].sort((a, b) => a.level - b.level);
      return {
        enabled: checked(f, "enabled"),
        announce: one(f, "announce") as ServerSettings["levels"]["announce"],
        announceChannelId: channelOrNull(ctx, one(f, "announceChannelId")),
        roleRewards: dedup,
        stackRewards: checked(f, "stackRewards"),
        noXpChannelIds: many(f, "noXpChannelIds").filter((id) => (channelOrNull(ctx, id) ?? categoryOrNull(ctx, id)) !== null),
        noXpRoleIds: rolesChecked(ctx, many(f, "noXpRoleIds"), false),
        roleMultipliers: multipliers(f, "multRole", "multRoleValue", (id) => ctx.guild.roles.some((r) => r.id === id)).map((m) => ({
          roleId: m.id,
          multiplier: m.multiplier,
        })),
        channelMultipliers: multipliers(f, "multChannel", "multChannelValue", (id) => (channelOrNull(ctx, id) ?? categoryOrNull(ctx, id)) !== null).map(
          (m) => ({ channelId: m.id, multiplier: m.multiplier }),
        ),
      };
    }
    case "counting":
      return { mode: one(f, "mode") as "classic" | "reset", allowMath: checked(f, "allowMath") };
    case "welcome":
      return {
        enabled: checked(f, "enabled"),
        channelId: channelOrNull(ctx, one(f, "channelId")),
        message: one(f, "message") || current.welcome.message,
        dmEnabled: checked(f, "dmEnabled"),
        dmMessage: one(f, "dmMessage") || current.welcome.dmMessage,
        autoRoleIds: rolesChecked(ctx, many(f, "autoRoleIds"), true),
        leaveEnabled: checked(f, "leaveEnabled"),
        leaveChannelId: channelOrNull(ctx, one(f, "leaveChannelId")),
        leaveMessage: one(f, "leaveMessage") || current.welcome.leaveMessage,
      };
    case "automod":
      return {
        enabled: checked(f, "enabled"),
        invites: checked(f, "invites"),
        duplicates: checked(f, "duplicates"),
        caps: checked(f, "caps"),
        massMentions: int(f, "massMentions"),
        action: one(f, "action") as "delete" | "warn" | "timeout",
        timeoutMinutes: int(f, "timeoutMinutes"),
        exemptRoleIds: rolesChecked(ctx, many(f, "exemptRoleIds"), false),
        exemptChannelIds: many(f, "exemptChannelIds").filter((id) => channelOrNull(ctx, id)),
      };
    case "modlog":
      return {
        channelId: channelOrNull(ctx, one(f, "channelId")),
        edits: checked(f, "edits"),
        deletes: checked(f, "deletes"),
        joins: checked(f, "joins"),
        leaves: checked(f, "leaves"),
        automod: checked(f, "automod"),
        config: checked(f, "config"),
        moderation: checked(f, "moderation"),
      };
    case "linkPreviews":
      return { enabled: checked(f, "enabled") };
    case "starboard":
      return { channelId: channelOrNull(ctx, one(f, "channelId")), threshold: int(f, "threshold") };
    case "confessions":
      // Blocked-confessor hashes are only managed via /confessmod, never via the form.
      return { channelId: channelOrNull(ctx, one(f, "channelId")) };
    case "warnings":
      return {
        dmMembers: checked(f, "dmMembers"),
        escalateAt: int(f, "escalateAt"),
        escalateAction: one(f, "escalateAction") as "timeout" | "kick",
        escalateMinutes: int(f, "escalateMinutes"),
        expireDays: int(f, "expireDays"),
      };
    case "birthdays": {
      const roleId = one(f, "roleId");
      return {
        channelId: channelOrNull(ctx, one(f, "channelId")),
        roleId: roleId ? (rolesChecked(ctx, [roleId], true)[0] ?? null) : null,
        hour: int(f, "hour"),
        message: one(f, "message") || current.birthdays.message,
      };
    }
    case "suggestions":
      return { channelId: channelOrNull(ctx, one(f, "channelId")), threads: checked(f, "threads") };
    case "tickets":
      return {
        categoryId: categoryOrNull(ctx, one(f, "categoryId")),
        staffRoleIds: rolesChecked(ctx, many(f, "staffRoleIds"), false).filter((id) => id !== ctx.guild.id),
        logChannelId: channelOrNull(ctx, one(f, "logChannelId")),
        transcripts: checked(f, "transcripts"),
        maxOpenPerUser: int(f, "maxOpenPerUser"),
      };
    case "mcStatus":
      // Owner-only feature (it may ping private addresses): managed with /mcstatus, never via the form.
      throw new FormError("The Minecraft status channel is managed with /mcstatus.");
  }
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------
function channelSelect(name: string, ctx: GuildContext, selected: string | null, allowNone = true) {
  return html`<select name="${name}">${allowNone ? html`<option value="">— none —</option>` : ""}${ctx.channels.map(
    (c) => html`<option value="${c.id}" ${c.id === selected ? html`selected` : ""}>#${c.name}</option>`,
  )}</select>`;
}

/** Text channels and categories, for XP rules that apply to either. */
function placeOptions(ctx: GuildContext, selected: readonly string[]) {
  return [
    ...ctx.channels.map((c) => html`<option value="${c.id}" ${selected.includes(c.id) ? html`selected` : ""}>#${c.name}</option>`),
    ...(ctx.categories ?? []).map((c) => html`<option value="${c.id}" ${selected.includes(c.id) ? html`selected` : ""}>📁 ${c.name}</option>`),
  ];
}

function roleOptions(ctx: GuildContext, selected: readonly string[]) {
  return ctx.guild.roles
    .filter((r) => r.id !== ctx.guild.id && !r.managed)
    .sort((a, b) => b.position - a.position)
    .map((r) => html`<option value="${r.id}" ${selected.includes(r.id) ? html`selected` : ""}>${r.name}</option>`);
}

const box = (name: string, label: string, on: boolean) =>
  html`<label class="check"><input type="checkbox" name="${name}" ${on ? html`checked` : ""}> ${label}</label>`;

function sectionForm(guildId: string, section: SectionName, title: string, csrf: string, body: SafeHtml) {
  return html`<form class="card" method="post" action="/g/${guildId}/${section}">
  <h2>${title}</h2>
  <input type="hidden" name="_csrf" value="${csrf}">
  ${body}
  <button type="submit">Save</button>
</form>`;
}

function guildPage(ctx: GuildContext, s: ServerSettings, csrf: string): SafeHtml {
  const g = ctx.guild.id;
  const roleName = (id: string) => ctx.guild.roles.find((r) => r.id === id)?.name ?? id;
  return html`<h1>${ctx.guild.name}</h1>
<p class="muted">Changes apply within a minute. Every change is recorded in the audit log.</p>
${sectionForm(g, "general", "🕒 Server time zone", csrf, html`
  <label>Time zone <span class="muted">(IANA name, e.g. America/Chicago or Europe/London; currently ${utcOffset(s.general.timezone)})</span></label>
  <input type="text" name="timezone" maxlength="64" list="timezones" value="${s.general.timezone}">
  <datalist id="timezones">${TIME_ZONES.map((tz) => html`<option value="${tz}">`)}</datalist>
  <p class="muted">Used for birthday announcements and the times in this server's audit log.</p>`)}
${sectionForm(g, "levels", "📈 Levels & XP", csrf, html`
  ${box("enabled", "Enable levels", s.levels.enabled)}
  <label>Level-up announcements</label>
  <select name="announce">${(["same", "channel", "dm", "off"] as const).map(
    (v) => html`<option value="${v}" ${s.levels.announce === v ? html`selected` : ""}>${{ same: "Same channel", channel: "A specific channel", dm: "DM the member", off: "Don't announce" }[v]}</option>`,
  )}</select>
  <label>Announcement channel</label>${channelSelect("announceChannelId", ctx, s.levels.announceChannelId)}
  ${box("stackRewards", "Keep lower reward roles when a higher one is earned", s.levels.stackRewards)}
  <label>Role rewards</label>
  ${s.levels.roleRewards.length
    ? html`<table>${s.levels.roleRewards.map((r) => html`<tr><td>Level ${r.level}</td><td>${roleName(r.roleId)}</td><td><label class="check"><input type="checkbox" name="removeReward" value="${String(r.level)}"> remove</label></td></tr>`)}</table>`
    : html`<p class="muted">None yet.</p>`}
  <div class="row"><div><label>Add reward at level</label><input type="number" name="rewardLevel" min="1" max="500"></div>
  <div><label>Role</label><select name="rewardRole"><option value="">—</option>${roleOptions(ctx, [])}</select></div></div>
  <h3>XP controls</h3>
  <label>Channels / categories that earn no XP</label><select name="noXpChannelIds" multiple size="5">${placeOptions(ctx, s.levels.noXpChannelIds)}</select>
  <label>Roles that earn no XP</label><select name="noXpRoleIds" multiple size="5">${roleOptions(ctx, s.levels.noXpRoleIds)}</select>
  <label>Role multipliers <span class="muted">(0.1–5; set 1 to remove; a member gets their best one)</span></label>
  ${[...s.levels.roleMultipliers.map((m) => ({ id: m.roleId, v: m.multiplier })), { id: "", v: 1 }].map(
    (m) => html`<div class="row"><div><select name="multRole"><option value="">—</option>${roleOptions(ctx, m.id ? [m.id] : [])}</select></div>
    <div><input type="number" name="multRoleValue" min="0.1" max="5" step="0.1" value="${String(m.v)}"></div></div>`,
  )}
  <label>Channel / category multipliers</label>
  ${[...s.levels.channelMultipliers.map((m) => ({ id: m.channelId, v: m.multiplier })), { id: "", v: 1 }].map(
    (m) => html`<div class="row"><div><select name="multChannel"><option value="">—</option>${placeOptions(ctx, m.id ? [m.id] : [])}</select></div>
    <div><input type="number" name="multChannelValue" min="0.1" max="5" step="0.1" value="${String(m.v)}"></div></div>`,
  )}`)}
${sectionForm(g, "counting", "🔢 Counting", csrf, html`
  <label>Mode</label><select name="mode">
    <option value="classic" ${s.counting.mode === "classic" ? html`selected` : ""}>Classic: wrong numbers are deleted</option>
    <option value="reset" ${s.counting.mode === "reset" ? html`selected` : ""}>Reset: a mistake resets to 0 (saves protect you)</option></select>
  ${box("allowMath", "Allow maths like 12*2", s.counting.allowMath)}`)}
${sectionForm(g, "welcome", "👋 Welcome & leave", csrf, html`
  ${box("enabled", "Post a welcome message", s.welcome.enabled)}
  <label>Welcome channel</label>${channelSelect("channelId", ctx, s.welcome.channelId)}
  <label>Welcome message <span class="muted">({user} {username} {server} {count})</span></label><textarea name="message" maxlength="1000">${s.welcome.message}</textarea>
  ${box("dmEnabled", "Also DM new members", s.welcome.dmEnabled)}
  <label>DM message</label><textarea name="dmMessage" maxlength="1000">${s.welcome.dmMessage}</textarea>
  <label>Auto-roles (max 5; hold Ctrl/Cmd to pick several)</label><select name="autoRoleIds" multiple size="6">${roleOptions(ctx, s.welcome.autoRoleIds)}</select>
  ${box("leaveEnabled", "Post a leave message", s.welcome.leaveEnabled)}
  <label>Leave channel (default: welcome channel)</label>${channelSelect("leaveChannelId", ctx, s.welcome.leaveChannelId)}
  <label>Leave message</label><textarea name="leaveMessage" maxlength="1000">${s.welcome.leaveMessage}</textarea>`)}
${sectionForm(g, "automod", "🛡️ Auto-mod", csrf, html`
  ${box("enabled", "Enable auto-mod", s.automod.enabled)}
  <div class="grid">${box("invites", "Block invite links", s.automod.invites)}${box("duplicates", "Block repeated messages", s.automod.duplicates)}${box("caps", "Block shouting", s.automod.caps)}</div>
  <div class="row"><div><label>Max mentions per message (0 = off)</label><input type="number" name="massMentions" min="0" max="50" value="${s.automod.massMentions}"></div>
  <div><label>Action</label><select name="action">${(["delete", "warn", "timeout"] as const).map((a) => html`<option value="${a}" ${s.automod.action === a ? html`selected` : ""}>${a}</option>`)}</select></div>
  <div><label>Timeout minutes</label><input type="number" name="timeoutMinutes" min="1" max="1440" value="${s.automod.timeoutMinutes}"></div></div>
  <label>Exempt roles</label><select name="exemptRoleIds" multiple size="5">${roleOptions(ctx, s.automod.exemptRoleIds)}</select>
  <label>Exempt channels</label><select name="exemptChannelIds" multiple size="5">${ctx.channels.map((c) => html`<option value="${c.id}" ${s.automod.exemptChannelIds.includes(c.id) ? html`selected` : ""}>#${c.name}</option>`)}</select>`)}
${sectionForm(g, "modlog", "📜 Mod log", csrf, html`
  <label>Mod log channel (keep it moderator-only: it shows edited/deleted text)</label>${channelSelect("channelId", ctx, s.modlog.channelId)}
  <div class="grid">${(["edits", "deletes", "joins", "leaves", "automod", "config", "moderation"] as const).map((k) => box(k, k, s.modlog[k]))}</div>`)}
${sectionForm(g, "warnings", "⚠️ Warnings & cases", csrf, html`
  ${box("dmMembers", "DM members when they're warned", s.warnings.dmMembers)}
  <div class="row"><div><label>Escalate every N active warnings (0 = never)</label><input type="number" name="escalateAt" min="0" max="20" value="${s.warnings.escalateAt}"></div>
  <div><label>Escalation</label><select name="escalateAction">${(["timeout", "kick"] as const).map((a) => html`<option value="${a}" ${s.warnings.escalateAction === a ? html`selected` : ""}>${a}</option>`)}</select></div>
  <div><label>Timeout minutes</label><input type="number" name="escalateMinutes" min="1" max="40320" value="${s.warnings.escalateMinutes}"></div>
  <div><label>Warnings expire after days (0 = never)</label><input type="number" name="expireDays" min="0" max="365" value="${s.warnings.expireDays}"></div></div>
  <p class="muted">Warn with <code>/warn</code>; review with <code>/warnings</code> and <code>/case</code>.</p>`)}
${sectionForm(g, "birthdays", "🎂 Birthdays", csrf, html`
  <label>Announcement channel (none = off)</label>${channelSelect("channelId", ctx, s.birthdays.channelId)}
  <label>Birthday role for the day</label><select name="roleId"><option value="">— none —</option>${roleOptions(ctx, s.birthdays.roleId ? [s.birthdays.roleId] : [])}</select>
  <label>Announce at hour (0–23, server time zone: ${s.general.timezone})</label><input type="number" name="hour" min="0" max="23" value="${s.birthdays.hour}">
  <label>Message <span class="muted">({user} {username} {server})</span></label><textarea name="message" maxlength="500">${s.birthdays.message}</textarea>`)}
${sectionForm(g, "suggestions", "💡 Suggestions", csrf, html`
  <label>Suggestions channel (none = off)</label>${channelSelect("channelId", ctx, s.suggestions.channelId)}
  ${box("threads", "Open a discussion thread on each suggestion", s.suggestions.threads)}`)}
${sectionForm(g, "tickets", "🎫 Tickets", csrf, html`
  <label>Ticket category (none = off)</label><select name="categoryId"><option value="">— none —</option>${(ctx.categories ?? []).map(
    (c) => html`<option value="${c.id}" ${c.id === s.tickets.categoryId ? html`selected` : ""}>${c.name}</option>`,
  )}</select>
  <label>Staff roles</label><select name="staffRoleIds" multiple size="5">${roleOptions(ctx, s.tickets.staffRoleIds)}</select>
  <label>Log channel</label>${channelSelect("logChannelId", ctx, s.tickets.logChannelId)}
  ${box("transcripts", "Attach a transcript when a ticket closes", s.tickets.transcripts)}
  <label>Open tickets allowed per member</label><input type="number" name="maxOpenPerUser" min="1" max="5" value="${s.tickets.maxOpenPerUser}">
  <p class="muted">Post the button with <code>/ticket panel</code>.</p>`)}
${sectionForm(g, "starboard", "⭐ Starboard", csrf, html`
  <label>Starboard channel</label>${channelSelect("channelId", ctx, s.starboard.channelId)}
  <label>Stars needed</label><input type="number" name="threshold" min="1" max="50" value="${s.starboard.threshold}">`)}
${sectionForm(g, "confessions", "🤫 Confessions", csrf, html`
  <label>Confession channel</label>${channelSelect("channelId", ctx, s.confessions.channelId)}
  <p class="muted">${s.confessions.bannedHashes.length} blocked confessor(s). Manage with <code>/confessmod</code>.</p>`)}
${sectionForm(g, "linkPreviews", "🔗 Link previews", csrf, box("enabled", "Preview xkcd and GitHub links", s.linkPreviews.enabled))}
<p><a class="btn secondary" href="/g/${g}/audit">View audit log</a></p>`;
}

const SECTION_NAMES = new Set<string>([
  "general",
  "levels",
  "counting",
  "welcome",
  "automod",
  "modlog",
  "linkPreviews",
  "starboard",
  "confessions",
  "warnings",
  "birthdays",
  "suggestions",
  "tickets",
]);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
export function registerRoutes(app: FastifyInstance, deps: Deps): void {
  const { cfg, sessions, oauth, bot } = deps;
  const secure = cfg.DASHBOARD_PUBLIC_URL.startsWith("https://");
  const cookieOpts = { path: "/", httpOnly: true, secure, sameSite: "lax" as const, signed: true };

  const sessionOf = (req: FastifyRequest): Session | null => {
    const raw = req.cookies[SID];
    if (!raw) return null;
    const un = req.unsignCookie(raw);
    return un.valid ? sessions.get(un.value) : null;
  };
  const isOwner = (s: Session) => cfg.BOT_OWNER_IDS.includes(s.userId);
  const page = (reply: FastifyReply, s: Session | null, title: string, body: SafeHtml, status = 200) => {
    const flash = s?.flash ?? null;
    if (s) s.flash = null;
    return reply.code(status).type("text/html; charset=utf-8").send(layout({ title, user: s, flash, body }).value);
  };
  /** Reject cross-site form posts: CSRF token AND same-origin Origin header. */
  const validPost = (req: FastifyRequest, s: Session, form: Form) => {
    const origin = req.headers.origin;
    if (origin && origin !== new URL(cfg.DASHBOARD_PUBLIC_URL).origin) return false;
    return csrfMatches(s, one(form, "_csrf"));
  };

  app.get("/static/style.css", async (_req, reply) => reply.type("text/css").header("cache-control", "public, max-age=3600").send(STYLE));

  app.get("/healthz", () => ({ ok: true }));

  app.get("/", async (req, reply) => {
    const s = sessionOf(req);
    if (!s) {
      return page(reply, null, "Dashboard", html`<div class="card"><h1>Antares Bot dashboard</h1>
<p>Manage Antares Bot settings for servers where you have <b>Manage Server</b>.</p>
<a class="btn" href="/login">Log in with Discord</a></div>`);
    }
    // Only servers the bot is actually in (it has a document) and the user could manage at login.
    const servers = await ServerModel.find({ _id: mongoose.trusted({ $in: s.guildIds }) }, { name: 1 }).sort({ name: 1 }).lean();
    return page(reply, s, "Your servers", html`<h1>Your servers</h1>
${isOwner(s) ? html`<p><a class="btn secondary" href="/owner">Owner panel</a></p>` : ""}
<div class="grid">${servers.map((g) => html`<a class="card" href="/g/${g._id}"><b>${g.name || g._id}</b></a>`)}</div>
${servers.length ? "" : html`<p class="muted">No servers where you can manage Antares Bot. The bot must be in the server and you need Manage Server.</p>`}
<form method="post" action="/logout"><input type="hidden" name="_csrf" value="${s.csrf}"><button class="secondary" type="submit">Log out</button></form>`);
  });

  app.get("/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (_req, reply) => {
    const state = randomBytes(24).toString("base64url");
    reply.setCookie(STATE, state, { ...cookieOpts, maxAge: 600 });
    return reply.redirect(oauth.authorizeUrl(state), 302);
  });

  app.get<{ Querystring: { code?: string; state?: string } }>(
    "/auth/callback",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const raw = req.cookies[STATE];
      reply.clearCookie(STATE, { path: "/" });
      const expected = raw ? req.unsignCookie(raw) : null;
      const got = req.query.state ?? "";
      const ok =
        !!expected?.valid &&
        typeof expected.value === "string" &&
        expected.value.length === got.length &&
        timingSafeEqual(Buffer.from(expected.value), Buffer.from(got));
      if (!ok || !req.query.code) return page(reply, null, "Login failed", html`<div class="card">Login failed or expired. <a href="/login">Try again</a>.</div>`, 400);

      const result = await oauth.login(req.query.code);
      const s = sessions.create({ userId: result.user.id, username: result.user.username, avatarUrl: result.user.avatarUrl, guildIds: result.manageableGuildIds });
      reply.setCookie(SID, s.id, { ...cookieOpts, maxAge: Math.floor(SESSION_TTL_MS / 1000) });
      return reply.redirect("/", 303);
    },
  );

  app.post<{ Body: Form }>("/logout", async (req, reply) => {
    const s = sessionOf(req);
    if (s && validPost(req, s, req.body)) sessions.destroy(s.id);
    reply.clearCookie(SID, { path: "/" });
    return reply.redirect("/", 303);
  });

  // ---- server settings -----------------------------------------------------
  app.get<{ Params: { guildId: string } }>("/g/:guildId", async (req, reply) => {
    const s = sessionOf(req);
    if (!s) return reply.redirect("/login", 302);
    const ctx = await bot.manageContext(req.params.guildId, s.userId);
    if (!ctx) return page(reply, s, "Not allowed", html`<div class="card">You can't manage that server (or the bot isn't in it).</div>`, 403);
    return page(reply, s, ctx.guild.name, guildPage(ctx, await getFeatureSettings(ctx.guild.id), s.csrf));
  });

  app.post<{ Params: { guildId: string; section: string }; Body: Form }>("/g/:guildId/:section", async (req, reply) => {
    const s = sessionOf(req);
    if (!s) return reply.redirect("/login", 302);
    if (!validPost(req, s, req.body)) return page(reply, s, "Rejected", html`<div class="card">Invalid or expired form. Go back and try again.</div>`, 403);
    if (!SECTION_NAMES.has(req.params.section)) return reply.code(404).send();
    const section = req.params.section as SectionName;
    // Re-verified live on every change: losing Manage Server revokes access immediately.
    const ctx = await bot.manageContext(req.params.guildId, s.userId);
    if (!ctx) return page(reply, s, "Not allowed", html`<div class="card">You can't manage that server (or the bot isn't in it).</div>`, 403);

    try {
      const current = await getFeatureSettings(ctx.guild.id);
      const patch = buildPatch(section, req.body, ctx, current);
      const saved = await updateSettings(ctx.guild.id, section, patch as never);
      if (!saved) throw new FormError("The bot has no record of this server yet.");
      await recordAudit({
        guildId: ctx.guild.id,
        actorId: s.userId,
        actorTag: s.username,
        source: "dashboard",
        action: `settings.${section}`,
        details: JSON.stringify(saved).slice(0, 1000),
      });
      const modlog = (await getFeatureSettings(ctx.guild.id)).modlog;
      if (modlog.channelId && modlog.config) {
        await bot.postEmbed(modlog.channelId, {
          title: "Settings changed (dashboard)",
          description: `Section: **${section}**\nBy: <@${s.userId}>`,
          color: 0x3498db,
          timestamp: new Date().toISOString(),
        });
      }
      s.flash = { ok: true, text: `Saved ${section} settings.` };
    } catch (err) {
      if (err instanceof SettingsValidationError) s.flash = { ok: false, text: err.issues.join("; ") };
      else if (err instanceof FormError) s.flash = { ok: false, text: err.message };
      else throw err;
    }
    return reply.redirect(`/g/${ctx.guild.id}`, 303);
  });

  app.get<{ Params: { guildId: string } }>("/g/:guildId/audit", async (req, reply) => {
    const s = sessionOf(req);
    if (!s) return reply.redirect("/login", 302);
    const ctx = await bot.manageContext(req.params.guildId, s.userId);
    if (!ctx) return page(reply, s, "Not allowed", html`<div class="card">You can't manage that server.</div>`, 403);
    const [rows, settings] = await Promise.all([recentAudit({ guildId: ctx.guild.id, limit: 100 }), getFeatureSettings(ctx.guild.id)]);
    const tz = settings.general.timezone;
    return page(reply, s, "Audit log", html`<h1>${ctx.guild.name}: audit log</h1><div class="card"><table>
<tr><th>When (${tz})</th><th>Who</th><th>Via</th><th>Action</th><th>Details</th></tr>
${rows.map((r) => html`<tr><td>${formatInZone(r.at, tz)}</td><td>${r.actorTag || r.actorId}</td><td>${r.source}</td><td>${r.action}</td><td><code>${r.details}</code></td></tr>`)}
</table></div><p><a href="/g/${ctx.guild.id}">← Back</a></p>`);
  });

  // ---- owner panel -----------------------------------------------------------
  app.get("/owner", async (req, reply) => {
    const s = sessionOf(req);
    if (!s) return reply.redirect("/login", 302);
    if (!isOwner(s)) return reply.code(404).send(); // don't even reveal it exists
    const [stats, entries, audit] = await Promise.all([
      getBotStats(),
      GateEntryModel.find().sort({ kind: 1, createdAt: -1 }).limit(500).lean(),
      recentAudit({ limit: 100 }),
    ]);
    const kindLabel: Record<GateKind, string> = { user: "Banned user", guild: "Banned server", owner: "Banned server owner", ignored_guild: "Ignored server" };
    return page(reply, s, "Owner panel", html`<h1>Owner panel</h1>
<div class="grid">
<div class="card"><b>${stats.totalServers.toLocaleString("en-US")}</b><br><span class="muted">servers</span></div>
<div class="card"><b>${stats.totalUsers.toLocaleString("en-US")}</b><br><span class="muted">users</span></div>
<div class="card"><b>${stats.totalMessages.toLocaleString("en-US")}</b><br><span class="muted">messages counted</span></div></div>
<form class="card" method="post" action="/owner/gate"><h2>Bans & ignores</h2>
<input type="hidden" name="_csrf" value="${s.csrf}">
<div class="row"><div><label>Type</label><select name="kind">${GATE_KINDS.map((k) => html`<option value="${k}">${kindLabel[k]}</option>`)}</select></div>
<div><label>ID</label><input type="text" name="targetId" pattern="\\d{17,20}" required></div>
<div><label>Action</label><select name="op"><option value="add">Add</option><option value="remove">Remove</option></select></div></div>
<button type="submit">Apply</button></form>
<div class="card"><table><tr><th>Type</th><th>ID</th><th>Since</th></tr>
${entries.map((e) => html`<tr><td>${kindLabel[e.kind]}</td><td><code>${e.targetId}</code></td><td>${e.createdAt.toISOString().slice(0, 10)}</td></tr>`)}
</table></div>
<div class="card"><h2>Recent audit log (all servers)</h2><table><tr><th>When</th><th>Server</th><th>Who</th><th>Action</th><th>Details</th></tr>
${audit.map((r) => html`<tr><td>${r.at.toISOString().replace("T", " ").slice(0, 19)}</td><td><code>${r.guildId ?? "—"}</code></td><td>${r.actorTag || r.actorId}</td><td>${r.action}</td><td><code>${r.details}</code></td></tr>`)}
</table></div>`);
  });

  app.post<{ Body: Form }>("/owner/gate", async (req, reply) => {
    const s = sessionOf(req);
    if (!s) return reply.redirect("/login", 302);
    if (!isOwner(s)) return reply.code(404).send();
    if (!validPost(req, s, req.body)) return page(reply, s, "Rejected", html`<div class="card">Invalid or expired form.</div>`, 403);
    const kind = one(req.body, "kind") as GateKind;
    const targetId = one(req.body, "targetId").trim();
    const op = one(req.body, "op");
    if (!GATE_KINDS.includes(kind) || !/^\d{17,20}$/.test(targetId) || !["add", "remove"].includes(op)) {
      s.flash = { ok: false, text: "Invalid input." };
      return reply.redirect("/owner", 303);
    }
    if (op === "add" && kind !== "ignored_guild" && cfg.BOT_OWNER_IDS.includes(targetId)) {
      s.flash = { ok: false, text: "Refusing to ban a bot owner." };
      return reply.redirect("/owner", 303);
    }
    const id = gateEntryId(kind, targetId);
    if (op === "add") await GateEntryModel.updateOne({ _id: id }, { $setOnInsert: { kind, targetId, createdAt: new Date() } }, { upsert: true });
    else await GateEntryModel.deleteOne({ _id: id });
    await recordAudit({ guildId: null, actorId: s.userId, actorTag: s.username, source: "dashboard", action: `gate.${op}`, details: `${kind} ${targetId}` });
    s.flash = { ok: true, text: `${op === "add" ? "Added" : "Removed"} ${kind} ${targetId}. The bot picks this up within a minute.` };
    return reply.redirect("/owner", 303);
  });
}
