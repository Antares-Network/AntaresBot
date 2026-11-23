/** Pure moderation rules (no Discord or database access), unit-tested. */

/** Escalate on every Nth active warning: 3, 6, 9… with escalateAt = 3. 0 disables. */
export function shouldEscalate(activeWarnings: number, escalateAt: number): boolean {
  return escalateAt > 0 && activeWarnings > 0 && activeWarnings % escalateAt === 0;
}

/** Oldest warning that still counts, or null when warnings never expire. */
export function warningCutoff(expireDays: number, now = Date.now()): Date | null {
  return expireDays > 0 ? new Date(now - expireDays * 86_400_000) : null;
}

export interface Hierarchy {
  actorId: string;
  targetId: string;
  ownerId: string;
  targetIsBot: boolean;
  /** Highest-role positions; null when the target isn't in the server. */
  actorTop: number;
  targetTop: number | null;
}

/** Why a moderator may not act on a member, or null if they may. */
export function moderationProblem(h: Hierarchy): string | null {
  if (h.targetIsBot) return "You can't do that to a bot.";
  if (h.targetId === h.actorId) return "You can't do that to yourself.";
  if (h.targetId === h.ownerId) return "You can't do that to the server owner.";
  if (h.actorId !== h.ownerId && h.targetTop !== null && h.targetTop >= h.actorTop) {
    return "That member's highest role is not below yours.";
  }
  return null;
}
