// Antares Bot v2 — https://antaresnetwork.com
// Original project started December 15, 2020 by Nate Goldsborough.
// v2: discord.js 14 + Sapphire, rewritten for security and maintainability.
import "@sapphire/plugin-logger/register";
import { fileURLToPath } from "node:url";
import {
  ApplicationCommandRegistries,
  container,
  LogLevel,
  RegisterBehavior,
  SapphireClient,
} from "@sapphire/framework";
import { GatewayIntentBits, Options, Partials } from "discord.js";
import mongoose from "mongoose";
import { config, type Config } from "./lib/config.js";
import { runMigrations } from "./lib/db/migrations.js";
import { stopAllGames } from "./lib/services/games.js";
import { flushBuffers, stopTasks } from "./lib/tasks.js";

declare module "@sapphire/pieces" {
  interface Container {
    config: Config;
  }
}

const LOG_LEVELS = {
  trace: LogLevel.Trace,
  debug: LogLevel.Debug,
  info: LogLevel.Info,
  warn: LogLevel.Warn,
  error: LogLevel.Error,
  fatal: LogLevel.Fatal,
} as const;

async function main() {
  const cfg = config();
  container.config = cfg;

  // Replace the whole command set on Discord when it differs. This also cleans up the
  // stale v1 WOKCommands defaults (/prefix, /command, /requiredrole, /update ...).
  ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

  const client = new SapphireClient({
    baseUserDirectory: fileURLToPath(new URL(".", import.meta.url)),
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers, // privileged: member counts, welcome/leave, auto-roles
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions, // starboard
      GatewayIntentBits.MessageContent, // privileged: counting, games, auto-mod, auto-replies, XP, mod log
    ],
    // Reactions/edits/deletes on messages sent before the last restart arrive as partials.
    partials: [Partials.Message, Partials.Reaction, Partials.User, Partials.GuildMember],
    // Keep the message cache bounded (it holds text only in memory, for the mod log).
    makeCache: Options.cacheWithLimits({ ...Options.DefaultMakeCacheSettings, MessageManager: 200 }),
    sweepers: {
      ...Options.DefaultSweeperSettings,
      messages: { interval: 3600, lifetime: 6 * 3600 },
    },
    // Never let user-controlled text ping @everyone/@here/roles unless a command opts in.
    allowedMentions: { parse: ["users"], repliedUser: true },
    loadMessageCommandListeners: false,
    defaultCooldown: { delay: 3_000, filteredUsers: cfg.BOT_OWNER_IDS },
    logger: { level: LOG_LEVELS[cfg.LOG_LEVEL] },
  });

  mongoose.set("strictQuery", true);
  // Defence in depth against NoSQL injection: any query filter value that is an object
  // with $-operators gets wrapped in $eq unless explicitly marked mongoose.trusted().
  mongoose.set("sanitizeFilter", true);
  await mongoose.connect(cfg.BOT_MONGO_PATH, { serverSelectionTimeoutMS: 15_000 });
  container.logger.info("Connected to MongoDB");
  await runMigrations();

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    container.logger.info(`${signal} received, shutting down...`);
    stopTasks();
    await stopAllGames();
    try {
      await flushBuffers();
    } catch (err) {
      container.logger.error("Failed to flush buffered stats on shutdown:", err);
    }
    await client.destroy();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await client.login(cfg.BOT_TOKEN);
}

process.on("unhandledRejection", (reason) => {
  container.logger.error("Unhandled promise rejection:", reason);
});

main().catch((err: unknown) => {
  // container.logger may not exist yet if config failed; fall back to stderr.
  process.stderr.write(`Fatal startup error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
