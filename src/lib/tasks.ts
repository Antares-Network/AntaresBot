import { writeFile } from "node:fs/promises";
import { container } from "@sapphire/framework";
import { Status, time, type Client } from "discord.js";
import { claimDueReminders } from "./services/reminders.js";
import mongoose from "mongoose";
import { postJson } from "./http.js";
import { flushServerWrites } from "./services/servers.js";
import { presence } from "./services/presence.js";
import { refreshBotStats } from "./services/stats.js";
import { flushMemberStats } from "./services/members.js";
import { flushUserActivity } from "./services/users.js";
import { runBirthdays } from "./services/birthdays.js";
import { refreshAllStatusChannels } from "./services/mcStatusChannels.js";
import { runAsnMonitor } from "./services/asnMonitor.js";

/** In a directory only the bot user can write (created in the Dockerfile), not the shared /tmp. */
export const HEARTBEAT_FILE = "/run/antaresbot/heartbeat";

const timers: NodeJS.Timeout[] = [];

/** Write all buffered counters (server message/member counts, user + per-server stats). */
export async function flushBuffers(): Promise<void> {
  const results = await Promise.allSettled([flushServerWrites(), flushUserActivity(), flushMemberStats()]);
  const failed = results.find((r) => r.status === "rejected");
  if (failed) throw failed.reason;
}

/**
 * Deliver due reminders. Each is claimed (deleted) atomically before sending, so it is
 * delivered at most once; it goes to the original channel if the bot can still post
 * there, otherwise to the user's DMs. Only the reminder's owner is ever pinged.
 */
export async function deliverReminders(client: Client<true>): Promise<void> {
  for (const r of await claimDueReminders()) {
    const content = `⏰ <@${r.userId}>, you asked me to remind you ${time(r.createdAt, "R")}:\n>>> ${r.text}`;
    const allowedMentions = { users: [r.userId] };
    let sent = false;
    if (r.channelId) {
      const ch = await client.channels.fetch(r.channelId).catch(() => null);
      if (ch?.isSendable()) sent = await ch.send({ content, allowedMentions }).then(() => true, () => false);
    }
    if (!sent) {
      await client.users.send(r.userId, { content, allowedMentions }).catch(() => {
        container.logger.debug(`Reminder ${r.id} could not be delivered (DMs closed?)`);
      });
    }
  }
}

/** Run `fn` now and every `ms`, never overlapping, logging (not throwing) on failure. */
function every(name: string, ms: number, fn: () => Promise<void> | void, { runNow = true } = {}) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await fn();
    } catch (err) {
      container.logger.warn(`Task "${name}" failed:`, err);
    } finally {
      running = false;
    }
  };
  if (runNow) void tick();
  timers.push(setInterval(() => void tick(), ms));
}

export function startTasks(client: Client<true>): void {
  const cfg = container.config;

  every("flush-buffers", 30_000, flushBuffers, { runNow: false });
  every("bot-stats", 5 * 60_000, () => refreshBotStats(client));
  every("reminders", 15_000, () => deliverReminders(client));
  every("birthdays", 10 * 60_000, () => runBirthdays(client));
  // Discord allows ~2 channel renames per 10 minutes, so this can't run more often.
  every("mc-status-channels", 10 * 60_000, () => refreshAllStatusChannels(client));

  // AS202902 route monitor. RIPEstat's routing data refreshes every few hours at most,
  // so 15 minutes catches changes promptly without hammering a free public API.
  const asnChannel = cfg.ASN_MONITOR_CHANNEL;
  if (asnChannel) every("asn-monitor", 15 * 60_000, () => runAsnMonitor(client, asnChannel));

  // Liveness heartbeat for the Docker HEALTHCHECK: only written while the gateway is
  // connected AND the database answers, so a wedged bot is reported unhealthy.
  every("heartbeat", 30_000, async () => {
    if (client.ws.status !== Status.Ready) return;
    const db = mongoose.connection.db;
    if (!db) return; // no database handle = not healthy: don't refresh the heartbeat
    await db.admin().ping();
    await writeFile(HEARTBEAT_FILE, String(Date.now()));
  });

  // Rotating presence (v1 status-changer), now owner-editable with /setstatus and stored in bot_config.
  presence.start(client);

  // Uptime Kuma push monitor (v1 statuspage feature).
  if (cfg.UPTIME_KUMA_PUSH_URL) {
    const base = cfg.UPTIME_KUMA_PUSH_URL;
    every("uptime-kuma", 60_000, async () => {
      const url = new URL(base);
      url.searchParams.set("status", "up");
      url.searchParams.set("msg", "OK");
      url.searchParams.set("ping", String(Math.max(client.ws.ping, 0)));
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      await res.body?.cancel();
      if (!res.ok) throw new Error(`push returned HTTP ${res.status}`);
    });
  }

  // Bot list server counts (replaces the unmaintained `dbots` package; dead lists dropped).
  if (cfg.TOP_GG_TOKEN || cfg.DISCORD_BOTS_GG_TOKEN) {
    every("bot-lists", 30 * 60_000, async () => {
      const servers = client.guilds.cache.size;
      if (cfg.TOP_GG_TOKEN) {
        const s = await postJson(`https://top.gg/api/bots/${client.user.id}/stats`, { server_count: servers }, {
          authorization: cfg.TOP_GG_TOKEN,
        });
        if (s >= 400) container.logger.warn(`top.gg stats post returned HTTP ${s}`);
      }
      if (cfg.DISCORD_BOTS_GG_TOKEN) {
        const s = await postJson(`https://discord.bots.gg/api/v1/bots/${client.user.id}/stats`, { guildCount: servers }, {
          authorization: cfg.DISCORD_BOTS_GG_TOKEN,
        });
        if (s >= 400) container.logger.warn(`discord.bots.gg stats post returned HTTP ${s}`);
      }
    });
  }
}

export function stopTasks(): void {
  presence.stop();
  for (const t of timers.splice(0)) clearInterval(t);
}
