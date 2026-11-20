import { z } from "zod";

const snowflake = z.string().regex(/^\d{17,20}$/, "must be a Discord snowflake ID");

/** Comma-separated list of snowflakes, e.g. "123,456". Empty string -> []. */
const snowflakeList = z
  .string()
  .default("")
  .transform((s) =>
    s
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  )
  .pipe(z.array(snowflake));

/** Like snowflakeList, but at least one entry is required (typed as a non-empty tuple). */
const nonEmptySnowflakeList = z
  .string({ error: "is required" })
  .transform((s) =>
    s
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  )
  .pipe(z.tuple([snowflake], snowflake, { error: "at least one ID is required" }));

/** Treat empty strings in .env as "not set" so optional values behave sanely. */
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  /** Development only: print every server message to the console. Off by default (privacy). */
  CHAT_LOG: optionalString.pipe(z.stringbool().optional()).transform((v) => v ?? false),

  BOT_TOKEN: z.string().min(50, "BOT_TOKEN looks invalid"),
  // The bot uses a local MongoDB container (see compose.yml); cloud SRV URIs are not used.
  BOT_MONGO_PATH: z.string().regex(/^mongodb:\/\//, "BOT_MONGO_PATH must be a mongodb:// URI"),
  BOT_OWNER_IDS: nonEmptySnowflakeList,
  /** Guilds where owner-only slash commands are registered. Never exposed elsewhere. */
  DEV_GUILD_IDS: snowflakeList,
  REPORTING_CHANNEL: snowflake.optional().or(z.literal("").transform(() => undefined)),

  NASA_API_KEY: optionalString,
  /** HMAC key for anonymous confessions (>= 32 chars). Unset = /confess disabled. Never change it once used. */
  CONFESSION_SECRET: optionalString.pipe(z.string().min(32, "must be at least 32 characters").optional()),
  UPTIME_KUMA_PUSH_URL: optionalString.pipe(z.url({ protocol: /^https$/ }).optional()),

  TOP_GG_TOKEN: optionalString,
  DISCORD_BOTS_GG_TOKEN: optionalString,
});

export type Config = z.infer<typeof EnvSchema>;

/** Map v1 variable names onto v2 ones so an existing .env keeps working. */
export function applyLegacyEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const out = { ...env };
  const blank = (v: string | undefined) => v === undefined || v.trim() === "";
  if (blank(out.BOT_OWNER_IDS) && !blank(out.BOT_OWNER_ID)) out.BOT_OWNER_IDS = out.BOT_OWNER_ID;
  if (blank(out.DEV_GUILD_IDS) && !blank(out.TEST_SERVERS)) out.DEV_GUILD_IDS = out.TEST_SERVERS;
  const kumaDomain = out.UPTIME_KUMA_MONITOR_DOMAIN?.trim();
  const kumaId = out.UPTIME_KUMA_MONITOR_ID?.trim();
  if (blank(out.UPTIME_KUMA_PUSH_URL) && kumaDomain && kumaId) {
    out.UPTIME_KUMA_PUSH_URL = `https://${kumaDomain}/api/push/${encodeURIComponent(kumaId)}`;
  }
  return out;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(applyLegacyEnv(env));
  if (!parsed.success) {
    // Only report which keys failed and why — never echo values (they may be secrets).
    const problems = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return parsed.data;
}

let cached: Config | undefined;

/** Lazily-loaded singleton so modules can import config without import-order surprises. */
export function config(): Config {
  cached ??= loadConfig();
  return cached;
}
