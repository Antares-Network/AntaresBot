import type { Client } from "discord.js";
import { BotStatsModel, ServerModel } from "../db/models/index.js";
import { toCount } from "../util.js";

export interface BotStats {
  totalMessages: number;
  totalServers: number;
  totalUsers: number;
  updatedAt: Date | null;
}

/** Recompute aggregate stats (one aggregation; v1 guessed completion with a 60s timer). */
export async function refreshBotStats(client: Client): Promise<void> {
  const guildIds = [...client.guilds.cache.keys()];
  const [agg] = await ServerModel.aggregate<{ total: number }>([
    { $match: { _id: { $in: guildIds } } },
    { $group: { _id: null, total: { $sum: "$messageCount" } } },
  ]);

  let totalUsers = 0;
  const owners = new Set<string>();
  for (const guild of client.guilds.cache.values()) {
    totalUsers += guild.memberCount;
    owners.add(guild.ownerId);
  }

  await BotStatsModel.updateOne(
    { _id: "global" },
    {
      $set: {
        totalMessages: agg?.total ?? 0,
        totalServers: client.guilds.cache.size,
        totalUsers,
        guildOwnerIds: [...owners],
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function getBotStats(): Promise<BotStats> {
  const doc = await BotStatsModel.findById("global").lean();
  return {
    totalMessages: toCount(doc?.totalMessages),
    totalServers: toCount(doc?.totalServers),
    totalUsers: toCount(doc?.totalUsers),
    updatedAt: doc?.updatedAt instanceof Date ? doc.updatedAt : null,
  };
}
