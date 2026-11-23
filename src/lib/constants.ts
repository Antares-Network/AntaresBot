import { createRequire } from "node:module";
import { PermissionFlagsBits, PermissionsBitField } from "discord.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string };

export const VERSION: string = pkg.version;

export const BRAND_COLOR = 0xff3505;
export const ICON_URL = "https://antaresnetwork.com/resources/icon.png";
export const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

export const SUPPORT_SERVER_URL = "https://antaresnetwork.com/discord";
export const GITHUB_URL = "https://github.com/Antares-Network/AntaresBot";
export const STATUS_PAGE_URL = "https://status.antaresnetwork.com";
export const STATS_PAGE_URL = "https://antaresnetwork.com/antaresbot/stats";
export const SNIPS_URL = "https://antaresnetwork.com/snips";
export const SLASH_FAQ_URL =
  "https://support.discord.com/hc/en-us/articles/1500000368501-Slash-Commands-FAQ";

/** Antares Network's own autonomous system, shown by /as202902 and watched by the route monitor. */
export const NETWORK_ASN = 202902;
export const NETWORK_SITE_URL = "https://as202902.net";
/** AS202902's status dashboard (also listed in its PeeringDB record). */
export const NETWORK_STATUS_URL = "https://heartbeat.as202902.net";

export const SEASONBOT_URL ="https://seasonbot.antaresnetwork.com";
export const SEASONBOT_INVITE_URL =
  "https://discord.com/oauth2/authorize?client_id=774520746344054824&scope=bot&permissions=126032";

/**
 * Permissions requested on invite: v1's set (388177) plus Manage Roles (role buttons,
 * auto-roles, level rewards) and Moderate Members (auto-mod timeouts).
 */
export const INVITE_PERMISSIONS = new PermissionsBitField([
  PermissionFlagsBits.CreateInstantInvite,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.UseExternalEmojis,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.SendPolls,
]).bitfield.toString();

export function inviteUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    permissions: INVITE_PERMISSIONS,
    scope: "bot applications.commands",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
