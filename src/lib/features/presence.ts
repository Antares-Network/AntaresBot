/** Pure status-rotation logic (placeholders, defaults, validation), unit-tested. */
import type { StatusType } from "../db/models.js";

export interface StatusEntry {
  text: string;
  type: StatusType;
}

export interface StatusVars {
  servers: number;
  /** Members across all servers (sum of member counts). */
  users: number;
  /** Messages counted across all servers. */
  messages: number;
  uptimeMs: number;
  /** Gateway heartbeat ping; negative = not measured yet. */
  pingMs: number;
  version: string;
  commands: number;
}

export const PLACEHOLDERS: Record<string, { describe: string; render: (v: StatusVars) => string }> = {
  servers: { describe: "servers the bot is in", render: (v) => v.servers.toLocaleString("en-US") },
  users: { describe: "members across all servers", render: (v) => v.users.toLocaleString("en-US") },
  messages: { describe: "messages counted", render: (v) => v.messages.toLocaleString("en-US") },
  uptime: { describe: "time since the bot started", render: (v) => shortUptime(v.uptimeMs) },
  ping: { describe: "gateway ping", render: (v) => (v.pingMs >= 0 ? `${Math.round(v.pingMs)}ms` : "…") },
  version: { describe: "bot version", render: (v) => v.version },
  commands: { describe: "number of commands", render: (v) => String(v.commands) },
};

export const MAX_STATUS_LENGTH = 128;
export const MAX_ROTATION = 25;
export const DEFAULT_INTERVAL_SEC = 300;
export const MIN_INTERVAL_SEC = 30;
export const MAX_INTERVAL_SEC = 3600;

/** Own-property lookup, so inherited names like {constructor} or {__proto__} aren't treated as placeholders. */
function placeholder(name: string) {
  return Object.hasOwn(PLACEHOLDERS, name) ? PLACEHOLDERS[name] : undefined;
}

/** Whether a template uses a given placeholder (so costly values are only fetched when needed). */
export function usesPlaceholder(template: string, name: string): boolean {
  return template.includes(`{${name}}`);
}

/** Compact uptime: "12m", "4h 12m", "3d 4h". */
export function shortUptime(ms: number): string {
  const m = Math.floor(Math.max(0, ms) / 60_000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

/** Placeholder names used in a template that don't exist (so typos are caught when saving). */
export function unknownPlaceholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string).filter((name) => !placeholder(name));
}

/** Fill in {placeholders}; anything else is left as written. Result is clipped to Discord's limit. */
export function renderStatus(template: string, vars: StatusVars): string {
  const out = template.replace(/\{(\w+)\}/g, (whole, name: string) => placeholder(name)?.render(vars) ?? whole);
  return out.length > MAX_STATUS_LENGTH ? `${out.slice(0, MAX_STATUS_LENGTH - 1)}…` : out;
}

/** The rotation used until an owner edits it (the v1 status changer, now with live values). */
export const DEFAULT_ROTATION: readonly StatusEntry[] = [
  { text: "/help | V.{version}", type: "playing" },
  { text: "/help | {servers} Servers", type: "playing" },
  { text: "/help | antaresnetwork.com", type: "playing" },
  { text: "/help | {servers} Servers", type: "playing" },
  { text: "/help | nathen418.com", type: "playing" },
  { text: "/help | {servers} Servers", type: "playing" },
  { text: "/help | status.antaresnetwork.com", type: "playing" },
];

/** Move an item; indexes are 0-based and clamped. Returns a new array. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const out = [...items];
  const [item] = out.splice(from, 1);
  if (item === undefined) return out;
  out.splice(Math.min(Math.max(to, 0), out.length), 0, item);
  return out;
}

/**
 * Where the rotation should be after a tick. `last` is the entry shown previously and its index.
 * The entry is looked up again (nearest match to its old index) so edits that add, remove or
 * reorder items keep the rotation in place. With `advance` false (an edit was just applied) the
 * current entry is re-shown instead of skipping to the next one.
 */
export function rotationIndex(
  rotation: readonly StatusEntry[],
  last: { index: number; entry: StatusEntry } | null,
  advance: boolean,
): number {
  const len = rotation.length;
  if (len === 0 || !last) return 0;
  let found = -1;
  for (let i = 0; i < len; i++) {
    const e = rotation[i] as StatusEntry;
    if (e.text === last.entry.text && e.type === last.entry.type && (found < 0 || Math.abs(i - last.index) < Math.abs(found - last.index))) found = i;
  }
  if (found >= 0) return advance ? (found + 1) % len : found;
  // The shown entry was removed or edited: whatever now sits at its index comes next.
  return last.index < len ? last.index : 0;
}
