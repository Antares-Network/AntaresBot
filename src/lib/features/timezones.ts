/** Server time zone helpers (IANA names via Intl, no libraries). Pure, unit-tested. */

/** Every IANA zone the runtime knows, plus UTC, for autocomplete. */
export const TIME_ZONES: readonly string[] = [...new Set(["UTC", ...Intl.supportedValuesOf("timeZone")])];

/**
 * Up to `limit` zones matching what someone has typed so far. Spaces count as underscores
 * ("new york" finds America/New_York); matches at the start of the city or zone come first.
 */
export function matchTimeZones(query: string, limit = 25): string[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, "_");
  if (!q) return TIME_ZONES.slice(0, limit);
  const rank = (tz: string): number => {
    const z = tz.toLowerCase();
    const city = z.slice(z.lastIndexOf("/") + 1);
    if (z === q || city === q) return 0;
    if (city.startsWith(q) || z.startsWith(q)) return 1;
    return z.includes(q) ? 2 : -1;
  };
  return TIME_ZONES.map((tz) => ({ tz, r: rank(tz) }))
    .filter((m) => m.r >= 0)
    .sort((a, b) => a.r - b.r || a.tz.localeCompare(b.tz))
    .slice(0, limit)
    .map((m) => m.tz);
}

/** A wall-clock date and time in a time zone, e.g. "2026-11-19 09:30". */
export function formatInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "??";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/** The zone's current UTC offset, e.g. "UTC-06:00" (or "UTC" for zero). */
export function utcOffset(timeZone: string, now = new Date()): string {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(now)
    .find((p) => p.type === "timeZoneName")?.value;
  return !name || /^GMT([+-]00:00)?$/.test(name) ? "UTC" : name.replace("GMT", "UTC");
}
