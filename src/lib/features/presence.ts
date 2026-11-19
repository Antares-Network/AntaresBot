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
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string).filter((name) => !(name in PLACEHOLDERS));
}

/** Fill in {placeholders}; anything else is left as written. Result is clipped to Discord's limit. */
export function renderStatus(template: string, vars: StatusVars): string {
  const out = template.replace(/\{(\w+)\}/g, (whole, name: string) => PLACEHOLDERS[name]?.render(vars) ?? whole);
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
