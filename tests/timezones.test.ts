import { describe, expect, it } from "vitest";
import { formatInZone, matchTimeZones, TIME_ZONES, utcOffset } from "../src/lib/features/timezones.js";

describe("server time zones", () => {
  it("lists UTC and real IANA zones", () => {
    expect(TIME_ZONES[0]).toBe("UTC");
    expect(TIME_ZONES).toContain("America/Chicago");
  });

  it("matches what someone types, city starts first, at most 25", () => {
    expect(matchTimeZones("new york")[0]).toBe("America/New_York");
    expect(matchTimeZones("london")[0]).toBe("Europe/London");
    expect(matchTimeZones("Europe/").every((tz) => tz.startsWith("Europe/"))).toBe(true);
    expect(matchTimeZones("")).toHaveLength(25);
    expect(matchTimeZones("zzzz-nowhere")).toEqual([]);
  });

  it("formats wall-clock times in a zone", () => {
    const t = new Date("2026-11-19T03:30:00Z");
    expect(formatInZone(t, "UTC")).toBe("2026-11-19 03:30");
    expect(formatInZone(t, "America/Chicago")).toBe("2026-11-18 21:30");
    expect(formatInZone(new Date("2026-11-19T00:05:00Z"), "Asia/Kolkata")).toBe("2026-11-19 05:35");
  });

  it("shows the current UTC offset", () => {
    expect(utcOffset("UTC")).toBe("UTC");
    expect(utcOffset("America/Chicago", new Date("2026-11-19T12:00:00Z"))).toBe("UTC-06:00");
    expect(utcOffset("America/Chicago", new Date("2026-07-01T12:00:00Z"))).toBe("UTC-05:00");
  });
});
