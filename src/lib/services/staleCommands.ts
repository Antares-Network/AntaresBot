import { container } from "@sapphire/framework";
import type { Client } from "discord.js";
import { MigrationModel } from "../db/models.js";

export const CLEAR_V1_GUILD_COMMANDS = "clear-v1-guild-commands";

/**
 * v1 (WOKCommands) registered its slash commands per-guild in its test servers. v2 registers
 * everything globally (owner commands only in DEV_GUILD_IDS, which Sapphire manages), so any
 * other guild-scoped command of this application is a stale v1 copy. Discord shows those next
 * to the real ones and Sapphire ignores their unknown IDs: "The application did not respond".
 *
 * Runs once (recorded in `migrations`); a guild that fails is retried on the next start.
 */
export async function clearStaleGuildCommands(client: Client<true>, devGuildIds: readonly string[]): Promise<void> {
  if (await MigrationModel.exists({ _id: CLEAR_V1_GUILD_COMMANDS })) return;
  const log = container.logger;
  const dev = new Set(devGuildIds);
  let cleared = 0;
  let failed = 0;

  // Sequential on purpose: discord.js queues per route anyway and this keeps us well inside rate limits.
  for (const guild of client.guilds.cache.values()) {
    if (dev.has(guild.id)) continue;
    try {
      const existing = await client.application.commands.fetch({ guildId: guild.id });
      if (existing.size === 0) continue;
      await client.application.commands.set([], guild.id);
      cleared++;
      log.info(`Removed ${existing.size} stale v1 guild command(s) from ${guild.name} (${guild.id})`);
    } catch (err) {
      failed++;
      log.warn(`Could not clear stale guild commands in ${guild.id}:`, err);
    }
  }

  if (failed === 0) {
    await MigrationModel.updateOne(
      { _id: CLEAR_V1_GUILD_COMMANDS },
      { $setOnInsert: { ranAt: new Date(), details: { guildsCleared: cleared } } },
      { upsert: true },
    );
  }
}
