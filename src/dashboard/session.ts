import { randomBytes, timingSafeEqual } from "node:crypto";

export interface Session {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  /** Guilds the user could manage when they logged in. Re-verified live on every request. */
  guildIds: string[];
  csrf: string;
  expiresAt: number;
  flash: { ok: boolean; text: string } | null;
}

export const SESSION_TTL_MS = 8 * 3_600_000;
const MAX_SESSIONS = 10_000;

/**
 * Server-side, in-memory session store. The cookie only carries a random 256-bit ID
 * (signed); no Discord tokens are kept at all. Sessions vanish on restart (users log in again).
 */
export class SessionStore {
  private readonly sessions = new Map<string, Session>();

  public create(data: Omit<Session, "id" | "csrf" | "expiresAt" | "flash">, now = Date.now()): Session {
    this.prune(now);
    if (this.sessions.size >= MAX_SESSIONS) {
      const oldest = this.sessions.keys().next().value;
      if (oldest) this.sessions.delete(oldest);
    }
    const s: Session = {
      ...data,
      id: randomBytes(32).toString("base64url"),
      csrf: randomBytes(32).toString("base64url"),
      expiresAt: now + SESSION_TTL_MS,
      flash: null,
    };
    this.sessions.set(s.id, s);
    return s;
  }

  public get(id: string | undefined, now = Date.now()): Session | null {
    if (!id) return null;
    const s = this.sessions.get(id);
    if (!s) return null;
    if (s.expiresAt <= now) {
      this.sessions.delete(id);
      return null;
    }
    return s;
  }

  public destroy(id: string | undefined): void {
    if (id) this.sessions.delete(id);
  }

  public get size() {
    return this.sessions.size;
  }

  private prune(now: number) {
    for (const [id, s] of this.sessions) if (s.expiresAt <= now) this.sessions.delete(id);
  }
}

/** Constant-time CSRF token comparison. */
export function csrfMatches(session: Session, submitted: unknown): boolean {
  if (typeof submitted !== "string") return false;
  const a = Buffer.from(session.csrf);
  const b = Buffer.from(submitted);
  return a.length === b.length && timingSafeEqual(a, b);
}
