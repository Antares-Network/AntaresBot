import { PermissionFlagsBits, type GuildMember, type Role } from "discord.js";

/**
 * Permissions that must never be handed out by self-assign buttons, auto-roles or level
 * rewards: any of these would let a regular member escalate to moderator/admin.
 */
export const DANGEROUS_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageNicknames,
  PermissionFlagsBits.ManageGuildExpressions,
  PermissionFlagsBits.ManageEvents,
  PermissionFlagsBits.ManageThreads,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.MentionEveryone,
  PermissionFlagsBits.ViewAuditLog,
  PermissionFlagsBits.MoveMembers,
  PermissionFlagsBits.MuteMembers,
  PermissionFlagsBits.DeafenMembers,
] as const;

/**
 * Why a role can't be auto-assigned, or null if it is safe. Checks that the bot can
 * manage it, that it isn't @everyone / a bot-managed role, that it grants nothing
 * dangerous, and (when configuring) that the admin doing it outranks the role.
 */
export function roleAssignProblem(role: Role, configuredBy?: GuildMember): string | null {
  const me = role.guild.members.me;
  if (role.id === role.guild.id) return "@everyone can't be assigned.";
  if (role.managed) return `${role.name} is managed by an integration.`;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return "I need the Manage Roles permission.";
  if (role.comparePositionTo(me.roles.highest) >= 0) return `${role.name} is above my highest role.`;
  if (DANGEROUS_PERMISSIONS.some((p) => role.permissions.has(p))) {
    return `${role.name} grants moderator/admin permissions, so it can't be handed out automatically.`;
  }
  if (configuredBy && configuredBy.id !== role.guild.ownerId && role.comparePositionTo(configuredBy.roles.highest) >= 0) {
    return `${role.name} is not below your highest role.`;
  }
  return null;
}
