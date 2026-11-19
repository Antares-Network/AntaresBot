/**
 * The two privacy-policy deletions, in one place so every new kind of stored data is
 * covered by both paths. Tests assert nothing is left behind.
 */
import { deleteRulesForGuild } from "./autoreplies.js";
import { deleteCasesForGuild } from "./cases.js";
import { deleteSuggestionsForGuild, scrubSuggestionsForUser } from "./suggestions.js";
import { deleteTicketsForGuild, deleteTicketsForUser } from "./tickets.js";
import { deleteConfessionsForGuild } from "./confessions.js";
import { deleteMemberDataForGuild, deleteMemberDataForUser } from "./members.js";
import { deleteRemindersForGuild, deleteRemindersForUser } from "./reminders.js";
import { deleteServer } from "./servers.js";
import { deleteStarboardForGuild } from "./starboard.js";
import { deleteUserData } from "./users.js";

/**
 * /remove: the user's profile, every per-server record (XP, counting, birthdays), their
 * reminders, ticket records and suggestion votes; their name is detached from suggestions.
 * Confessions are not linkable to a user (keyed hash), so there is nothing to find there.
 * Moderation cases are kept: they are the server's record of rule-breaking, not the user's
 * data to erase (stated in the privacy policy); they go when the bot leaves the server.
 */
export async function deleteAllUserData(userId: string): Promise<{ profile: boolean; memberRecords: number; reminders: number }> {
  const [profile, memberRecords, reminders] = await Promise.all([
    deleteUserData(userId),
    deleteMemberDataForUser(userId),
    deleteRemindersForUser(userId),
    deleteTicketsForUser(userId),
    scrubSuggestionsForUser(userId),
  ]);
  return { profile, memberRecords, reminders };
}

/** The bot left a server: everything stored about that server goes. */
export async function deleteAllGuildData(guildId: string): Promise<void> {
  await Promise.all([
    deleteServer(guildId),
    deleteMemberDataForGuild(guildId),
    deleteRulesForGuild(guildId),
    deleteConfessionsForGuild(guildId),
    deleteStarboardForGuild(guildId),
    deleteRemindersForGuild(guildId),
    deleteCasesForGuild(guildId),
    deleteSuggestionsForGuild(guildId),
    deleteTicketsForGuild(guildId),
  ]);
}
