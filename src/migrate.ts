// Run the database migrations only: no Discord login, no BOT_TOKEN needed.
// Used to rehearse the v1 -> v2 migration on a copy of the production data, and for the
// cut-over itself (migrate first, check, then start the bot). Safe to run repeatedly:
// every migration is recorded in `migrations` and skipped once done.
//   docker compose run --rm --no-deps -e BOT_MONGO_PATH=... bot node dist/migrate.js
import { container, Logger, LogLevel } from "@sapphire/framework";
import mongoose from "mongoose";
import { runMigrations } from "./lib/db/migrations.js";

async function main() {
  const uri = process.env.BOT_MONGO_PATH;
  if (!uri) throw new Error("BOT_MONGO_PATH is not set");
  container.logger = new Logger(LogLevel.Info);

  mongoose.set("strictQuery", true);
  mongoose.set("sanitizeFilter", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  container.logger.info(`Connected to MongoDB (database "${mongoose.connection.name}"). Running migrations...`);
  await runMigrations();
  container.logger.info("Migrations finished.");
  await mongoose.disconnect();
}

main().catch(async (err: unknown) => {
  process.stderr.write(`Migration failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
