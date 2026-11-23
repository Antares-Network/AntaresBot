// Dashboard entry point: `node dist/dashboard/main.js` (the `dashboard` compose service).
import mongoose from "mongoose";
import { loadDashboardConfig } from "./config.js";
import { DiscordBotApi, DiscordOAuth } from "./discord.js";
import { buildApp } from "./server.js";
import { SessionStore } from "./session.js";

async function main() {
  const cfg = loadDashboardConfig();
  mongoose.set("strictQuery", true);
  mongoose.set("sanitizeFilter", true);
  await mongoose.connect(cfg.BOT_MONGO_PATH, { serverSelectionTimeoutMS: 15_000 });

  const app = await buildApp({
    cfg,
    sessions: new SessionStore(),
    oauth: new DiscordOAuth(cfg),
    bot: new DiscordBotApi(cfg.BOT_TOKEN),
  });

  const shutdown = async () => {
    await app.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.once("SIGTERM", () => void shutdown());
  process.once("SIGINT", () => void shutdown());

  await app.listen({ host: "0.0.0.0", port: cfg.DASHBOARD_PORT });
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
