import { z } from "zod";
import { applyLegacyEnv } from "../lib/config.js";

const snowflake = z.string().regex(/^\d{17,20}$/);

/** "https://x.com///" -> "https://x.com" (a loop, not /\/+$/, which is quadratic on long runs of "/"). */
function trimTrailingSlashes(u: string): string {
  let end = u.length;
  while (end > 0 && u[end - 1] === "/") end--;
  return u.slice(0, end);
}

const DashboardEnv = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  BOT_TOKEN: z.string().min(50),
  BOT_MONGO_PATH: z.string().regex(/^mongodb:\/\//),
  BOT_OWNER_IDS: z
    .string()
    .transform((s) => s.split(",").map((v) => v.trim()).filter(Boolean))
    .pipe(z.array(snowflake).min(1)),
  DISCORD_CLIENT_ID: snowflake,
  DISCORD_CLIENT_SECRET: z.string().min(20),
  /** Public base URL, e.g. https://bot.example.com — used for the OAuth redirect and Origin checks. */
  DASHBOARD_PUBLIC_URL: z.url({ protocol: /^https?$/ }).transform(trimTrailingSlashes),
  /** Signs session cookies. >= 32 random characters. */
  DASHBOARD_SESSION_SECRET: z.string().min(32),
  DASHBOARD_PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  /** Set to "true" only when running behind a reverse proxy you control (e.g. Nginx Proxy Manager). */
  DASHBOARD_TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type DashboardConfig = z.infer<typeof DashboardEnv>;

export function loadDashboardConfig(env: NodeJS.ProcessEnv = process.env): DashboardConfig {
  const parsed = DashboardEnv.safeParse(applyLegacyEnv(env));
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid dashboard configuration:\n${problems}`);
  }
  const cfg = parsed.data;
  if (cfg.NODE_ENV === "production" && !cfg.DASHBOARD_PUBLIC_URL.startsWith("https://")) {
    throw new Error("DASHBOARD_PUBLIC_URL must be https:// in production (session cookies are Secure).");
  }
  return cfg;
}
