/** Auto-reply matching. Triggers are plain text, never regex (no ReDoS, no surprises). */

export type MatchMode = "exact" | "contains" | "word";

export interface AutoReplyRule {
  trigger: string; // lower-cased
  match: MatchMode;
  response: string;
}

export const MAX_RULES_PER_SERVER = 25;

export const normaliseTrigger = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

const isWordChar = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}_]/u.test(c);

/** First matching rule for a message, or null. Exact beats word beats contains. */
export function findReply(content: string, rules: readonly AutoReplyRule[]): AutoReplyRule | null {
  const text = normaliseTrigger(content);
  if (!text) return null;
  const order: MatchMode[] = ["exact", "word", "contains"];
  for (const mode of order) {
    for (const r of rules) {
      if (r.match !== mode) continue;
      if (mode === "exact" && text === r.trigger) return r;
      if (mode === "contains" && text.includes(r.trigger)) return r;
      if (mode === "word") {
        let i = text.indexOf(r.trigger);
        while (i !== -1) {
          if (!isWordChar(text[i - 1]) && !isWordChar(text[i + r.trigger.length])) return r;
          i = text.indexOf(r.trigger, i + 1);
        }
      }
    }
  }
  return null;
}
