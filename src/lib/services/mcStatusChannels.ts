import { container } from "@sapphire/framework";
import { ChannelType, PermissionFlagsBits, type Client, type Guild } from "discord.js";
import mongoose from "mongoose";
import { ServerModel } from "../db/models.js";
import { McPingError, pingMinecraft } from "./mcStatus.js";
import { getFeatureSettings } from "./settings.js";

/** Servers allowed to use status channels: the bot owners' own servers and the dev servers. */
export function isOwnerGuild(guild: Pick<Guild, "id" | "ownerId">): boolean {
  const { BOT_OWNER_IDS, DEV_GUILD_IDS } = container.config;
  return BOT_OWNER_IDS.includes(guild.ownerId) || DEV_GUILD_IDS.includes(guild.id);
}

export function statusChannelName(label: string, s: { online: number; max: number } | null): string {
  return (s ? `🟢 ${label}: ${s.online}/${s.max} online` : `🔴 ${label}: offline`).slice(0, 100);
}

/**
 * Refresh one status channel's name. Discord allows ~2 renames per 10 minutes per channel,
 * so this only renames when the text actually changed. Returns the name now shown.
 */
export async function refreshStatusChannel(guild: Guild): Promise<string | null> {
  const cfg = (await getFeatureSettings(guild.id)).mcStatus;
  if (!cfg.channelId || !cfg.address || !isOwnerGuild(guild)) return null;
  const channel = guild.channels.cache.get(cfg.channelId);
  if (!channel || (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice)) return null;
  const me = guild.members.me;
  if (!me || !channel.permissionsFor(me).has(PermissionFlagsBits.ManageChannels)) return null;

  let status: { online: number; max: number } | null = null;
  try {
    status = await pingMinecraft(cfg.address, { allowPrivate: true });
  } catch (err) {
    if (!(err instanceof McPingError)) throw err;
  }
  const name = statusChannelName(cfg.label, status);
  if (channel.name !== name) await channel.setName(name, "Minecraft status update");
  return name;
}

export async function refreshAllStatusChannels(client: Client<true>): Promise<void> {
  const rows = await ServerModel.find({ "settings.mcStatus.channelId": mongoose.trusted({ $type: "string" }) }, { _id: 1 }).lean();
  for (const { _id } of rows) {
    const guild = client.guilds.cache.get(_id);
    if (!guild) continue;
    await refreshStatusChannel(guild).catch((err: unknown) => {
      container.logger.warn(`Minecraft status channel failed in ${guild.id}:`, err);
    });
  }
}
