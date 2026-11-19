/** Pure auto-mod detectors. The listener decides what to do with a violation. */

export type Violation = "invite" | "mass-mentions" | "duplicate" | "caps";

export const VIOLATION_TEXT: Record<Violation, string> = {
  invite: "Posting server invites isn't allowed here.",
  "mass-mentions": "Please don't mention that many people at once.",
  duplicate: "Please don't repeat the same message.",
  caps: "Please don't shout (too many capital letters).",
};

const INVITE_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:discord(?:app)?\.com\/invite|discord\.(?:gg|io|me|li)|dsc\.gg)\/[a-z0-9-]+/i;

export function hasInvite(content: string): boolean {
  // Strip zero-width and formatting characters people use to dodge filters.
  return INVITE_RE.test(stripDodges(content));
}

/** Zero-width characters and markdown symbols people insert to dodge invite filters. */
const DODGE_CHARS = new Set(
  [0x200b, 0x200c, 0x200d, 0xfeff, 0x60, 0x2a, 0x5f, 0x7e, 0x7c, 0x5c].map((c) => String.fromCharCode(c)),
);
function stripDodges(s: string): string {
  return Array.from(s)
    .filter((ch) => !DODGE_CHARS.has(ch))
    .join("");
}

export function isShouting(content: string): boolean {
  const letters = content.replace(/<a?:\w+:\d+>|<[@#][!&]?\d+>|https?:\/\/\S+/g, "").replace(/[^\p{L}]/gu, "");
  if (letters.length < 12) return false;
  const upper = letters.replace(/[^\p{Lu}]/gu, "").length;
  return upper / letters.length >= 0.8;
}

/** Remembers each member's recent messages to spot copy-paste spam. In memory, hashed-free short window. */
export class DuplicateTracker {
  private readonly recent = new Map<string, { text: string; at: number; count: number }>();

  public constructor(
    private readonly windowMs = 30_000,
    private readonly threshold = 3,
  ) {}

  /** Returns true when the same text was sent `threshold` times inside the window. */
  public check(key: string, content: string, now = Date.now()): boolean {
    const text = content.trim().toLowerCase();
    if (text.length < 4) return false;
    const prev = this.recent.get(key);
    const count = prev && prev.text === text && now - prev.at < this.windowMs ? prev.count + 1 : 1;
    this.recent.set(key, { text, at: now, count });
    if (this.recent.size > 10_000) this.prune(now);
    return count >= this.threshold;
  }

  private prune(now: number) {
    for (const [k, v] of this.recent) if (now - v.at >= this.windowMs) this.recent.delete(k);
  }
}

export function detectViolation(
  content: string,
  mentionCount: number,
  opts: { invites: boolean; massMentions: number; caps: boolean; isRepeat: boolean },
): Violation | null {
  if (opts.invites && hasInvite(content)) return "invite";
  // The setting is the maximum ALLOWED, so only more than that is a violation.
  if (opts.massMentions > 0 && mentionCount > opts.massMentions) return "mass-mentions";
  if (opts.isRepeat) return "duplicate";
  if (opts.caps && isShouting(content)) return "caps";
  return null;
}
