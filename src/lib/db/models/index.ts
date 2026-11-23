/**
 * v2 data model. Holds the same information as v1 (see migrations.ts for the mapping),
 * but typed properly and shaped so every write can be atomic:
 *
 * One file per model in this folder; import them from here.
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

import { AuditModel } from "./audit.js";
import { AutoReplyModel } from "./autoReply.js";
import { BotConfigModel } from "./botConfig.js";
import { BotStatsModel } from "./botStats.js";
import { CaseModel } from "./case.js";
import { ConfessionModel } from "./confession.js";
import { GateEntryModel } from "./gateEntry.js";
import { MemberModel } from "./member.js";
import { MigrationModel } from "./migration.js";
import { ReminderModel } from "./reminder.js";
import { ServerModel } from "./server.js";
import { StarboardModel } from "./starboard.js";
import { SuggestionModel } from "./suggestion.js";
import { TicketModel } from "./ticket.js";
import { UserModel } from "./user.js";

export * from "./audit.js";
export * from "./autoReply.js";
export * from "./botConfig.js";
export * from "./botStats.js";
export * from "./case.js";
export * from "./confession.js";
export * from "./gateEntry.js";
export * from "./member.js";
export * from "./migration.js";
export * from "./reminder.js";
export * from "./server.js";
export * from "./starboard.js";
export * from "./suggestion.js";
export * from "./ticket.js";
export * from "./user.js";

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
