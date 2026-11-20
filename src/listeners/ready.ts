import { Events, Listener } from "@sapphire/framework";
import type { Client } from "discord.js";
import { syncServers } from "../lib/services/servers.js";
import { clearStaleGuildCommands } from "../lib/services/staleCommands.js";
import { getBotStats } from "../lib/services/stats.js";
import { startTasks } from "../lib/tasks.js";

export class ReadyListener extends Listener<typeof Events.ClientReady> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, once: true, event: Events.ClientReady });
  }

  public override async run(client: Client<true>) {
    const log = this.container.logger;
    log.info(`Logged in as ${client.user.tag}`);
    if (this.container.config.CHAT_LOG) log.warn("CHAT_LOG is on: every server message is printed to the console. Use for development only.");

    // Create/refresh every server's document in one bulk write (v1 onDBConnect did
    // two queries per guild, racing with guildCreate).
    try {
      const created = await syncServers(client.guilds.cache.values());
      if (created > 0) log.info(`Created documents for ${created} new server(s)`);
    } catch (err) {
      log.error("Could not sync server documents:", err);
    }

    const stats = await getBotStats().catch(() => null);
    log.info(`I am in ${client.guilds.cache.size} servers, used by ${stats?.totalUsers ?? 0} users`);

    startTasks(client);

    // Background: remove v1's leftover per-guild slash commands (one-time).
    clearStaleGuildCommands(client, this.container.config.DEV_GUILD_IDS).catch((err: unknown) => {
      log.warn("Stale guild command cleanup failed:", err);
    });

    // Tell the owner(s) the bot restarted (kept from v1).
    for (const id of this.container.config.BOT_OWNER_IDS) {
      client.users.send(id, "I have just restarted and am now back online.").catch((err: unknown) => {
        log.warn(`Startup DM to ${id} failed:`, err);
      });
    }
    log.info("Startup complete. Listening for input...");
  }
}
