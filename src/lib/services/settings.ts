/**
 * Per-server feature settings. These zod schemas are the single source of truth: every
 * read is parsed (corrupt or missing values fall back to defaults, section by section) and
 * every write — from /config or the web dashboard — is validated before it is stored.
 */
import mongoose from "mongoose";
import { z } from "zod";
import { ServerModel } from "../db/models.js";

const id = z.string().regex(/^\d{17,20}$/);
const nullableId = id.nullable().default(null);
const idList = (max: number) => z.array(id).max(max).default([]);
/** 0.1x – 5x (rounded to one decimal by the commands). */
const multiplier = z.number().min(0.1).max(5);

export const LevelsSettings = z.object({
  enabled: z.boolean().default(false),
  /** Where level-up messages go: the channel the member chatted in, a fixed channel, DM, or nowhere. */
  announce: z.enum(["same", "channel", "dm", "off"]).default("same"),
  announceChannelId: nullableId,
  roleRewards: z
    .array(z.object({ level: z.number().int().min(1).max(500), roleId: id }))
    .max(25)
    .default([]),
  /** Remove lower reward roles when a higher one is granted. */
  stackRewards: z.boolean().default(true),
  /** XP controls: channels/roles that never earn XP. */
  noXpChannelIds: idList(25),
  noXpRoleIds: idList(25),
  /** XP multipliers. A member gets their highest role multiplier times the channel's. */
  roleMultipliers: z
    .array(z.object({ roleId: id, multiplier: multiplier }))
    .max(20)
    .default([]),
  channelMultipliers: z
    .array(z.object({ channelId: id, multiplier: multiplier }))
    .max(20)
    .default([]),
});

export const CountingSettings = z.object({
  /** classic = v1 behaviour (wrong numbers are deleted); reset = a mistake resets to 0 unless a save is used. */
  mode: z.enum(["classic", "reset"]).default("classic"),
  allowMath: z.boolean().default(true),
});

const template = (max: number, fallback: string) => z.string().trim().min(1).max(max).default(fallback);

export const WelcomeSettings = z.object({
  enabled: z.boolean().default(false),
  channelId: nullableId,
  message: template(1000, "Welcome {user} to **{server}**! You are member #{count}."),
  dmEnabled: z.boolean().default(false),
  dmMessage: template(1000, "Welcome to **{server}**, {username}! Have a look around."),
  autoRoleIds: idList(5),
  leaveEnabled: z.boolean().default(false),
  leaveChannelId: nullableId,
  leaveMessage: template(1000, "**{username}** has left {server}."),
});

export const AutomodSettings = z.object({
  enabled: z.boolean().default(false),
  invites: z.boolean().default(true),
  /** Max distinct user/role mentions in one message; 0 disables the check. */
  massMentions: z.number().int().min(0).max(50).default(6),
  duplicates: z.boolean().default(true),
  caps: z.boolean().default(false),
  action: z.enum(["delete", "warn", "timeout"]).default("delete"),
  timeoutMinutes: z.number().int().min(1).max(1440).default(10),
  exemptRoleIds: idList(10),
  exemptChannelIds: idList(10),
});

export const ModlogSettings = z.object({
  channelId: nullableId,
  edits: z.boolean().default(true),
  deletes: z.boolean().default(true),
  joins: z.boolean().default(true),
  leaves: z.boolean().default(true),
  automod: z.boolean().default(true),
  config: z.boolean().default(true),
  /** Warnings, timeouts and other moderation cases. */
  moderation: z.boolean().default(true),
});

export const LinkPreviewSettings = z.object({ enabled: z.boolean().default(false) });

export const StarboardSettings = z.object({
  channelId: nullableId,
  threshold: z.number().int().min(1).max(50).default(3),
});

export const ConfessionSettings = z.object({
  channelId: nullableId,
  /** HMACs of blocked confessors (never user IDs). */
  bannedHashes: z.array(z.string().regex(/^[0-9a-f]{64}$/)).max(1000).default([]),
});

export const WarningSettings = z.object({
  /** DM members when they're warned. */
  dmMembers: z.boolean().default(true),
  /** Escalate every N active warnings (manual + auto-mod). 0 = never. */
  escalateAt: z.number().int().min(0).max(20).default(0),
  escalateAction: z.enum(["timeout", "kick"]).default("timeout"),
  escalateMinutes: z.number().int().min(1).max(40_320).default(60),
  /** Warnings older than this don't count toward escalation. 0 = they never expire. */
  expireDays: z.number().int().min(0).max(365).default(0),
});

/** IANA time zone names only (e.g. "America/Chicago"), checked against the runtime's database. */
export const timeZone = z
  .string()
  .max(64)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "unknown time zone");

/** Server-wide settings that several features share. */
export const GeneralSettings = z.object({
  /** The server's time zone: used wherever the bot works with local dates or prints wall-clock times. */
  timezone: timeZone.default("UTC"),
});

export const BirthdaySettings = z.object({
  channelId: nullableId,
  /** Role given for the day. */
  roleId: nullableId,
  /** Local hour (0–23, in the server's time zone) birthdays are announced. */
  hour: z.number().int().min(0).max(23).default(9),
  message: template(500, "🎂 Happy birthday {user}! Have a great day!"),
});

export const SuggestionSettings = z.object({
  channelId: nullableId,
  /** Open a discussion thread on every suggestion. */
  threads: z.boolean().default(true),
});

export const TicketSettings = z.object({
  /** Category new ticket channels are created in. Null = tickets off. */
  categoryId: nullableId,
  staffRoleIds: idList(5),
  /** Where closed-ticket summaries (and transcripts) are posted. */
  logChannelId: nullableId,
  transcripts: z.boolean().default(true),
  maxOpenPerUser: z.number().int().min(1).max(5).default(1),
});

/** Minecraft server status in a voice channel's name. Only configurable in bot-owner servers. */
export const McStatusSettings = z.object({
  channelId: nullableId,
  address: z
    .string()
    .trim()
    .max(260)
    .regex(/^[A-Za-z0-9.-]+(:\d{1,5})?$/, "use host or host:port")
    .nullable()
    .default(null),
  label: z.string().trim().min(1).max(40).default("Minecraft"),
});

export const SECTIONS = {
  general: GeneralSettings,
  levels: LevelsSettings,
  counting: CountingSettings,
  welcome: WelcomeSettings,
  automod: AutomodSettings,
  modlog: ModlogSettings,
  linkPreviews: LinkPreviewSettings,
  starboard: StarboardSettings,
  confessions: ConfessionSettings,
  warnings: WarningSettings,
  birthdays: BirthdaySettings,
  suggestions: SuggestionSettings,
  tickets: TicketSettings,
  mcStatus: McStatusSettings,
} as const;

export type SectionName = keyof typeof SECTIONS;
export type Section<K extends SectionName> = z.infer<(typeof SECTIONS)[K]>;
export type ServerSettings = { [K in SectionName]: Section<K> };

/** Parse raw stored settings; each section independently falls back to its defaults. */
export function parseSettings(raw: unknown): ServerSettings {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Partial<Record<SectionName, unknown>> = {};
  for (const [name, schema] of Object.entries(SECTIONS) as [SectionName, z.ZodType][]) {
    const parsed = schema.safeParse(obj[name] ?? {});
    out[name] = parsed.success ? parsed.data : schema.parse({});
  }
  return out as ServerSettings;
}

export const DEFAULT_SETTINGS: ServerSettings = parseSettings({});

// ---------------------------------------------------------------------------
// Cache: settings are read on every message (automod, levels, link previews), so they
// are cached per server. Writes go through updateSettings, which invalidates; a
// generation counter keeps a read that raced a write from caching stale settings.
// ---------------------------------------------------------------------------
const TTL_MS = 60_000;
const cache = new Map<string, { value: ServerSettings; at: number }>();
const generation = new Map<string, number>();

export function invalidateSettings(guildId: string): void {
  cache.delete(guildId);
  generation.set(guildId, (generation.get(guildId) ?? 0) + 1);
}

export async function getFeatureSettings(guildId: string): Promise<ServerSettings> {
  const hit = cache.get(guildId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const gen = generation.get(guildId) ?? 0;
  const doc = await ServerModel.findById(guildId, { settings: 1 }).lean();
  const value = parseSettings(doc?.settings);
  if ((generation.get(guildId) ?? 0) === gen) cache.set(guildId, { value, at: Date.now() });
  return value;
}

export class SettingsValidationError extends Error {
  public constructor(public readonly issues: string[]) {
    super(`Invalid settings: ${issues.join("; ")}`);
    this.name = "SettingsValidationError";
  }
}

export type SettingsPatch<K extends SectionName> = Partial<Section<K>> | ((current: Section<K>) => Partial<Section<K>>);

export class SettingsConflictError extends Error {}

/**
 * Merge a patch into one section, validate the whole section strictly, and store it.
 *
 *  - Reads the CURRENT stored value (never this process's cache): the bot and the
 *    dashboard are separate processes, and a stale base would silently undo the other's change.
 *  - Writes with compare-and-set on a per-section revision, retrying if another writer got
 *    in between, so concurrent edits from /config, /confessmod and the dashboard all survive.
 *  - `patch` may be a function of the current section (use this for list edits).
 *  - Unknown keys are rejected so a typo can't silently do nothing.
 *
 * Returns the new section, or null if the server has no document.
 * Throws SettingsValidationError (bad input) or SettingsConflictError (persistent contention).
 */
export async function updateSettings<K extends SectionName>(
  guildId: string,
  section: K,
  patch: SettingsPatch<K>,
): Promise<Section<K> | null> {
  const schema = (SECTIONS[section] as unknown as z.ZodObject).strict();
  for (let attempt = 0; attempt < 5; attempt++) {
    const doc = await ServerModel.findById(guildId, { settings: 1, settingsRev: 1 }).lean();
    if (!doc) return null;
    const current = parseSettings(doc.settings)[section];
    const rev = Number((doc.settingsRev as Record<string, unknown> | undefined)?.[section] ?? 0) || 0;
    const delta = typeof patch === "function" ? patch(current) : patch;
    const parsed = schema.safeParse({ ...current, ...delta });
    if (!parsed.success) {
      throw new SettingsValidationError(parsed.error.issues.map((i) => `${i.path.join(".") || section}: ${i.message}`));
    }
    const res = await ServerModel.updateOne(
      // rev 0 also matches documents that never had a revision for this section.
      { _id: guildId, [`settingsRev.${section}`]: mongoose.trusted(rev === 0 ? { $in: [0, null] } : { $eq: rev }) },
      { $set: { [`settings.${section}`]: parsed.data, [`settingsRev.${section}`]: rev + 1 } },
    );
    if (res.matchedCount === 1) {
      invalidateSettings(guildId);
      return parsed.data as Section<K>;
    }
  }
  invalidateSettings(guildId);
  throw new SettingsConflictError("Settings were being changed at the same time; please try again.");
}

// ---------------------------------------------------------------------------
// Message templates (welcome / leave / DM). Only these placeholders exist; nothing
// else in the template is interpreted, so admins can't inject anything dynamic.
// ---------------------------------------------------------------------------
export interface TemplateContext {
  userId: string;
  username: string;
  server: string;
  memberCount: number;
}

export function renderTemplate(template: string, ctx: TemplateContext): string {
  return template.replace(/\{(user|username|server|count)\}/g, (_, key: string) => {
    switch (key) {
      case "user":
        return `<@${ctx.userId}>`;
      case "username":
        return ctx.username;
      case "server":
        return ctx.server;
      default:
        return ctx.memberCount.toLocaleString("en-US");
    }
  });
}
