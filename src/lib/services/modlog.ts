import type { EmbedBuilder, Guild } from "discord.js";
import { getFeatureSettings } from "./settings.js";

export type ModlogEvent = "edits" | "deletes" | "joins" | "leaves" | "automod" | "config" | "moderation";

/**
 * Post to the server's mod-log channel if that event type is enabled. Message text shown
 * here comes from Discord's in-memory cache and is never written to the database.
 */
export async function sendModlog(guild: Guild, event: ModlogEvent, embed: EmbedBuilder): Promise<void> {
  const s = (await getFeatureSettings(guild.id)).modlog;
  if (!s.channelId || !s[event]) return;
  const ch = guild.channels.cache.get(s.channelId);
  if (!ch?.isSendable()) return;
  const me = guild.members.me;
  if (me && "permissionsFor" in ch && !ch.permissionsFor(me).has(["SendMessages", "EmbedLinks"])) return;
  await ch.send({ embeds: [embed.setTimestamp()], allowedMentions: { parse: [] } }).catch(() => undefined);
}
