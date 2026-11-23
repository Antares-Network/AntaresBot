import { randomInt } from "node:crypto";

/** Uniform random element. Uses crypto RNG so outcomes can't be predicted from Math.random state. */
export function pick<T>(items: readonly T[]): T {
  if (items.length === 0) throw new RangeError("pick() on empty array");
  return items[randomInt(items.length)] as T;
}

/**
 * Legacy data stored channel IDs either as "123..." or, due to an old /setup bug,
 * as the channel mention "<#123...>". Return the bare snowflake or null.
 */
export function toSnowflake(value: unknown): string | null {
  if (typeof value !== "string") return null;
  // Either a bare ID or a full "<#ID>" mention — not a half-bracketed mix.
  const match = /^(?:(\d{17,20})|<#(\d{17,20})>)$/.exec(value.trim());
  return match?.[1] ?? match?.[2] ?? null;
}

/**
 * Coerce a stored counter to a non-negative integer. Lean Mongo reads are typed from the
 * schema but are really raw data: legacy v1 documents can hold strings, null, or nothing.
 */
export function toCount(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

export function formatUptime(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor(ms / 3_600_000) % 24;
  const minutes = Math.floor(ms / 60_000) % 60;
  const seconds = Math.floor(ms / 1000) % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
