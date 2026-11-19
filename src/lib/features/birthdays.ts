/** Pure date logic for birthdays (time-zone aware via Intl, no libraries). */

export interface LocalDate {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
}

/** The wall-clock date and hour in an IANA time zone. */
export function localDate(now: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? NaN);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") % 24 };
}

export const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** Month/day validity, allowing 29 February. */
export function isValidBirthday(month: number, day: number): boolean {
  return (
    Number.isInteger(month) && Number.isInteger(day) && month >= 1 && month <= 12 && day >= 1 && day <= (DAYS_IN_MONTH[month - 1] ?? 0)
  );
}

/** Birthdays celebrated on this date: 29 Feb birthdays are celebrated on 28 Feb in non-leap years. */
export function birthdaysOn(d: Pick<LocalDate, "year" | "month" | "day">): { month: number; day: number }[] {
  const out = [{ month: d.month, day: d.day }];
  if (d.month === 2 && d.day === 28 && !isLeapYear(d.year)) out.push({ month: 2, day: 29 });
  return out;
}

/** Days from `today` until the next occurrence of a birthday (0 = today). */
export function daysUntil(today: Pick<LocalDate, "year" | "month" | "day">, month: number, day: number): number {
  const start = Date.UTC(today.year, today.month - 1, today.day);
  for (const year of [today.year, today.year + 1, today.year + 2, today.year + 3, today.year + 4]) {
    const d = month === 2 && day === 29 && !isLeapYear(year) ? 28 : day;
    const t = Date.UTC(year, month - 1, d);
    if (t >= start) return Math.round((t - start) / 86_400_000);
  }
  return 366;
}

export const dateKey = (d: Pick<LocalDate, "year" | "month" | "day">) =>
  `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const formatBirthday = (month: number, day: number) => `${MONTH_NAMES[month - 1] ?? "?"} ${day}`;
