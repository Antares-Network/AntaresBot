import { container } from "@sapphire/framework";

/**
 * Warn via Sapphire's logger when it exists (bot process), otherwise stderr. Shared code
 * also runs in the dashboard and in tests, where no SapphireClient is created, and a
 * logging call must never be what throws.
 */
export function safeWarn(message: string, err?: unknown): void {
  const logger = (container as { logger?: { warn(...args: unknown[]): void } }).logger;
  if (logger) logger.warn(message, ...(err === undefined ? [] : [err]));
  else process.stderr.write(`[warn] ${message}${err instanceof Error ? `: ${err.message}` : ""}\n`);
}
