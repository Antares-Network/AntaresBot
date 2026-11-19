/**
 * v2 data model. Holds the same information as v1 (see migrations.ts for the mapping),
 * but typed properly and shaped so every write can be atomic:
 *
 *   servers       one document per guild, _id = guild ID (duplicates impossible)
 *   gate_entries  one document per ban / ignore, _id = "<kind>:<id>"
 *   bot_stats     single document (_id "global") of aggregate stats
 *   users         one document per user who has used the bot, _id = user ID
 *   members       per-server per-user XP / counting stats, _id = "<guild>:<user>"
 *   reminders     pending /remind reminders
 *   autoreplies   per-server custom auto-replies
 *   confessions   anonymous confessions (author stored only as a keyed hash)
 *   starboard     original message -> starboard copy
 *   audit_log     privileged actions, auto-expires after 90 days
 *   cases         moderation cases (warnings, auto-mod, escalations), numbered per server
 *   suggestions   /suggest posts and their votes (the text lives only in the Discord message)
 *   tickets       support tickets (the conversation lives only in the Discord channel)
 *   bot_config    single document (_id "global"): the bot's status rotation
 *   migrations    records which one-time data migrations have run
 *
 * v1 collections (guilds, piis, gates) are only ever READ, never modified.
 */
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const snowflake = { type: String, match: /^\d{17,20}$/ } as const;
const optionalSnowflake = { ...snowflake, default: null } as const;

const serverSchema = new Schema(
  {
    _id: { ...snowflake, required: true },
    name: { type: String, default: "" },
    ownerId: optionalSnowflake, // refreshed from Discord on every startup
    iconUrl: { type: String, default: null },
    memberCount: { type: Number, default: 0, min: 0 },
    messageCount: { type: Number, default: 0, min: 0 },
    joinedAt: { type: Date, required: true },
    channels: {
      bot: optionalSnowflake,
      admin: optionalSnowflake,
      counting: optionalSnowflake,
    },
    counting: {
      current: { type: Number, default: 0, min: 0 },
      highScore: { type: Number, default: 0, min: 0 },
      /** "Reset" mode only: each save forgives one mistake. Earned every 100 counts. */
      saves: { type: Number, default: 0, min: 0 },
    },
    /**
     * Feature settings (levels, welcome, automod, ...). Validated by the zod schema in
     * services/settings.ts on every read and write, which is the single source of truth.
     */
    settings: { type: Schema.Types.Mixed, default: {} },
    /** Per-section revision numbers for compare-and-set updates of `settings`. */
    settingsRev: { type: Schema.Types.Mixed, default: {} },
    /** Per-server sequence numbers, allocated atomically with $inc. */
    seq: {
      case: { type: Number, default: 0, min: 0 },
      suggestion: { type: Number, default: 0, min: 0 },
      ticket: { type: Number, default: 0, min: 0 },
    },
    /** Birthday task state: the local date last announced, and who holds the role today. */
    birthdayState: { lastDate: { type: String, default: null }, roleHolders: { type: [String], default: [] } },
  },
  { collection: "servers", versionKey: false, timestamps: { createdAt: false, updatedAt: true }, minimize: false },
);

/** Per-server, per-member stats: XP/levels and the server's counting leaderboard. */
const memberSchema = new Schema(
  {
    _id: { type: String, required: true }, // "<guildId>:<userId>"
    guildId: { ...snowflake, required: true },
    userId: { ...snowflake, required: true },
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 0, min: 0 },
    countingCorrect: { type: Number, default: 0, min: 0 },
    countingMistakes: { type: Number, default: 0, min: 0 },
    /** Birthday (month/day only, never the year), set by the member in this server. */
    birthdayMonth: { type: Number, default: null, min: 1, max: 12 },
    birthdayDay: { type: Number, default: null, min: 1, max: 31 },
  },
  { collection: "members", versionKey: false },
);
memberSchema.index({ guildId: 1, xp: -1 });
memberSchema.index({ guildId: 1, countingCorrect: -1 });
memberSchema.index({ userId: 1 });
memberSchema.index({ guildId: 1, birthdayMonth: 1, birthdayDay: 1 }, { partialFilterExpression: { birthdayMonth: { $gte: 1 } } });

export const CASE_TYPES = ["warn", "automod", "timeout", "kick", "note"] as const;
export type CaseType = (typeof CASE_TYPES)[number];

/** Moderation cases. Kept when a member runs /remove (moderation record); deleted with the server. */
const caseSchema = new Schema(
  {
    guildId: { ...snowflake, required: true },
    number: { type: Number, required: true, min: 1 },
    userId: { ...snowflake, required: true },
    moderatorId: { ...snowflake, required: true },
    type: { type: String, enum: CASE_TYPES, required: true },
    reason: { type: String, default: "", maxlength: 500 },
    /** False once pardoned: still listed, no longer counts toward escalation. */
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "cases", versionKey: false },
);
caseSchema.index({ guildId: 1, number: 1 }, { unique: true });
caseSchema.index({ guildId: 1, userId: 1, createdAt: -1 });

export const SUGGESTION_STATUSES = ["open", "considered", "approved", "denied"] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

const suggestionSchema = new Schema(
  {
    guildId: { ...snowflake, required: true },
    number: { type: Number, required: true, min: 1 },
    /** Null after the author runs /remove. */
    authorId: optionalSnowflake,
    channelId: { ...snowflake, required: true },
    messageId: optionalSnowflake,
    status: { type: String, enum: SUGGESTION_STATUSES, default: "open" },
    up: { type: [String], default: [] },
    down: { type: [String], default: [] },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "suggestions", versionKey: false },
);
suggestionSchema.index({ guildId: 1, number: 1 }, { unique: true });
suggestionSchema.index({ up: 1 });
suggestionSchema.index({ down: 1 });

const ticketSchema = new Schema(
  {
    guildId: { ...snowflake, required: true },
    number: { type: Number, required: true, min: 1 },
    openerId: { ...snowflake, required: true },
    channelId: optionalSnowflake,
    status: { type: String, enum: ["open", "closed"], default: "open" },
    openedAt: { type: Date, default: () => new Date() },
    closedAt: { type: Date, default: null },
    closedBy: optionalSnowflake,
  },
  { collection: "tickets", versionKey: false },
);
ticketSchema.index({ guildId: 1, number: 1 }, { unique: true });
ticketSchema.index({ guildId: 1, openerId: 1, status: 1 });
ticketSchema.index({ channelId: 1 });

const reminderSchema = new Schema(
  {
    userId: { ...snowflake, required: true },
    guildId: optionalSnowflake,
    channelId: optionalSnowflake, // null = deliver by DM
    text: { type: String, required: true, maxlength: 500 },
    dueAt: { type: Date, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "reminders", versionKey: false },
);
reminderSchema.index({ dueAt: 1 });
reminderSchema.index({ userId: 1 });

const autoReplySchema = new Schema(
  {
    guildId: { ...snowflake, required: true },
    trigger: { type: String, required: true, maxlength: 100 }, // stored lower-cased
    match: { type: String, enum: ["exact", "contains", "word"], required: true },
    response: { type: String, required: true, maxlength: 500 },
    createdBy: { ...snowflake, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "autoreplies", versionKey: false },
);
autoReplySchema.index({ guildId: 1, trigger: 1 }, { unique: true });

/**
 * Anonymous confessions. The author is stored only as an HMAC of (guild, user) under a
 * server-side secret: moderators can block a confessor by confession number without
 * anyone (including the database) learning who they are.
 */
const confessionSchema = new Schema(
  {
    guildId: { ...snowflake, required: true },
    number: { type: Number, required: true },
    authorHash: { type: String, required: true },
    messageId: optionalSnowflake,
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "confessions", versionKey: false },
);
confessionSchema.index({ guildId: 1, number: 1 }, { unique: true });

/** Original message -> its starboard copy, so star counts update instead of duplicating. */
const starboardSchema = new Schema(
  {
    _id: { ...snowflake, required: true }, // original message ID
    guildId: { ...snowflake, required: true },
    channelId: { ...snowflake, required: true },
    starboardMessageId: optionalSnowflake,
    stars: { type: Number, default: 0 },
  },
  { collection: "starboard", versionKey: false },
);
starboardSchema.index({ guildId: 1 });

/** Privileged actions (owner/admin commands, dashboard changes). Expires after 90 days. */
const auditSchema = new Schema(
  {
    at: { type: Date, default: () => new Date() },
    guildId: optionalSnowflake,
    actorId: { ...snowflake, required: true },
    actorTag: { type: String, default: "" },
    source: { type: String, enum: ["command", "dashboard"], required: true },
    action: { type: String, required: true, maxlength: 64 },
    details: { type: String, default: "", maxlength: 1000 },
  },
  { collection: "audit_log", versionKey: false },
);
auditSchema.index({ at: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
auditSchema.index({ guildId: 1, at: -1 });

export const GATE_KINDS = ["user", "guild", "owner", "ignored_guild"] as const;
export type GateKind = (typeof GATE_KINDS)[number];

const gateEntrySchema = new Schema(
  {
    _id: { type: String, required: true }, // "<kind>:<targetId>"
    kind: { type: String, enum: GATE_KINDS, required: true },
    targetId: { ...snowflake, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "gate_entries", versionKey: false },
);
gateEntrySchema.index({ kind: 1 });

const botStatsSchema = new Schema(
  {
    _id: { type: String, default: "global" },
    totalMessages: { type: Number, default: 0 },
    totalServers: { type: Number, default: 0 },
    totalUsers: { type: Number, default: 0 },
    guildOwnerIds: { type: [String], default: [] },
    updatedAt: { type: Date, default: null },
  },
  { collection: "bot_stats", versionKey: false },
);

/**
 * One document per user who has interacted with the bot (ran a command or counted).
 * Users who merely chat in a server are never stored. Deleted by /remove.
 */
const userSchema = new Schema(
  {
    _id: { ...snowflake, required: true },
    username: { type: String, default: "" },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    stats: {
      commandsUsed: { type: Number, default: 0, min: 0 },
      /** Per-command usage, e.g. { cat: 12, ask: 3 } (what v1 sent to Statcord). */
      commands: { type: Map, of: Number, default: () => new Map() },
      countingCorrect: { type: Number, default: 0, min: 0 },
      countingMistakes: { type: Number, default: 0, min: 0 },
      lastCommandAt: { type: Date, default: null },
    },
    preferences: {
      /** Hide this user's /profile from everyone else. */
      privateProfile: { type: Boolean, default: false },
    },
  },
  { collection: "users", versionKey: false },
);

export const STATUS_TYPES = ["playing", "watching", "listening", "competing", "custom"] as const;
export type StatusType = (typeof STATUS_TYPES)[number];

const statusEntrySchema = new Schema(
  {
    text: { type: String, required: true, maxlength: 128 },
    type: { type: String, enum: STATUS_TYPES, default: "playing" },
  },
  { _id: false },
);

/** Bot-wide owner settings. The status rotation is edited with /setstatus and survives restarts. */
const botConfigSchema = new Schema(
  {
    _id: { type: String, default: "global" },
    /** Null until first edited: the built-in default rotation is used. */
    statusRotation: { type: [statusEntrySchema], default: null },
    statusIntervalSec: { type: Number, default: 300, min: 30, max: 3600 },
    /** A pinned status pauses the rotation. */
    statusPinned: { type: statusEntrySchema, default: null },
    /** Compare-and-set revision for edits. */
    rev: { type: Number, default: 0 },
  },
  { collection: "bot_config", versionKey: false },
);

const migrationSchema = new Schema(
  {
    _id: { type: String, required: true },
    ranAt: { type: Date, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { collection: "migrations", versionKey: false },
);

export type ServerDoc = InferSchemaType<typeof serverSchema>;
export type BotStatsDoc = InferSchemaType<typeof botStatsSchema>;

export const ServerModel = mongoose.model("Server", serverSchema);
export const GateEntryModel = mongoose.model("GateEntry", gateEntrySchema);
export const BotStatsModel = mongoose.model("BotStats", botStatsSchema);
export const UserModel = mongoose.model("User", userSchema);
export const MigrationModel = mongoose.model("Migration", migrationSchema);
export const MemberModel = mongoose.model("Member", memberSchema);
export const ReminderModel = mongoose.model("Reminder", reminderSchema);
export const AutoReplyModel = mongoose.model("AutoReply", autoReplySchema);
export const ConfessionModel = mongoose.model("Confession", confessionSchema);
export const StarboardModel = mongoose.model("Starboard", starboardSchema);
export const AuditModel = mongoose.model("Audit", auditSchema);
export const CaseModel = mongoose.model("Case", caseSchema);
export const SuggestionModel = mongoose.model("Suggestion", suggestionSchema);
export const TicketModel = mongoose.model("Ticket", ticketSchema);
export const BotConfigModel = mongoose.model("BotConfig", botConfigSchema);

export const gateEntryId = (kind: GateKind, targetId: string) => `${kind}:${targetId}`;
export const memberId = (guildId: string, userId: string) => `${guildId}:${userId}`;

/** Every model whose indexes should exist; used at startup. */
export const ALL_MODELS = [
  ServerModel,
  GateEntryModel,
  BotStatsModel,
  UserModel,
  MigrationModel,
  MemberModel,
  ReminderModel,
  AutoReplyModel,
  ConfessionModel,
  StarboardModel,
  AuditModel,
  CaseModel,
  SuggestionModel,
  TicketModel,
  BotConfigModel,
] as const;
