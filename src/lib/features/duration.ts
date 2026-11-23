const UNITS: Record<string, number> = {
  s: 1_000,
  sec: 1_000,
  second: 1_000,
  m: 60_000,
  min: 60_000,
  minute: 60_000,
  h: 3_600_000,
  hr: 3_600_000,
  hour: 3_600_000,
  d: 86_400_000,
  day: 86_400_000,
  w: 604_800_000,
  week: 604_800_000,
};

export const MAX_DURATION_MS = 365 * 86_400_000;

/**
 * Parse "90s", "10m", "2h30m", "1 day 4 hours", "1w". Returns milliseconds, or null if the
 * text isn't a duration or is outside 10 seconds .. 1 year.
 */
export function parseDuration(text: string): number | null {
  const src = text.trim().toLowerCase();
  if (!src || src.length > 40) return null;
  const re = /(\d{1,6})\s*([a-z]+?)s?(?=\d|\s|$)/g;
  let total = 0;
  let consumed = "";
  for (const m of src.matchAll(re)) {
    // Own properties only: "6constructor" must not find Object.prototype.constructor (-> NaN).
    const name = m[2] ?? "";
    const unit = Object.hasOwn(UNITS, name) ? UNITS[name] : undefined;
    if (!unit) return null;
    total += Number(m[1]) * unit;
    consumed += m[0];
  }
  if (consumed.replace(/\s+/g, "") !== src.replace(/\s+/g, "")) return null;
  if (!Number.isSafeInteger(total) || total < 10_000 || total > MAX_DURATION_MS) return null;
  return total;
}
