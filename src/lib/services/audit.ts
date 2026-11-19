import { AuditModel } from "../db/models.js";
import { safeWarn } from "../log.js";

export interface AuditEntry {
  guildId: string | null;
  actorId: string;
  actorTag: string;
  source: "command" | "dashboard";
  action: string;
  details: string;
}

/** Persist a privileged action (kept 90 days via TTL index). Never throws. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await AuditModel.create({ ...entry, action: entry.action.slice(0, 64), details: entry.details.slice(0, 1000) });
  } catch (err) {
    safeWarn("Failed to store audit entry", err);
  }
}

export async function recentAudit(opts: { guildId?: string; limit?: number } = {}) {
  const filter = opts.guildId ? { guildId: opts.guildId } : {};
  return AuditModel.find(filter).sort({ at: -1 }).limit(Math.min(opts.limit ?? 50, 200)).lean();
}
