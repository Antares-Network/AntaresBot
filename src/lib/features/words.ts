import { randomInt } from "node:crypto";
import { createRequire } from "node:module";
import { pick } from "../util.js";

/** Curated, family-friendly words for /scramble (recognisable, 5–8 letters). */
export const SCRAMBLE_WORDS = [
  "planet", "galaxy", "rocket", "comet", "orbit", "nebula", "meteor", "eclipse", "gravity", "asteroid",
  "castle", "dragon", "wizard", "knight", "potion", "shield", "goblin", "kingdom", "treasure", "quest",
  "pickaxe", "diamond", "creeper", "furnace", "redstone", "portal", "village", "emerald", "obsidian", "zombie",
  "pizza", "burger", "noodle", "pancake", "waffle", "cookie", "muffin", "pretzel", "taco", "sandwich",
  "guitar", "piano", "trumpet", "violin", "drummer", "melody", "rhythm", "concert", "singer", "chorus",
  "computer", "keyboard", "monitor", "laptop", "router", "server", "network", "browser", "program", "pixel",
  "garden", "flower", "forest", "meadow", "river", "mountain", "valley", "island", "desert", "glacier",
  "penguin", "dolphin", "giraffe", "elephant", "panther", "rabbit", "turtle", "squirrel", "hamster", "parrot",
  "winter", "summer", "autumn", "spring", "thunder", "rainbow", "blizzard", "breeze", "sunrise", "sunset",
  "pumpkin", "candle", "lantern", "spooky", "skeleton", "costume", "monster", "haunted", "witch", "ghost",
  "soccer", "tennis", "hockey", "cricket", "bowling", "skating", "surfing", "archery", "boxing", "cycling",
  "library", "teacher", "student", "pencil", "notebook", "science", "history", "puzzle", "riddle", "mystery",
] as const;

export function scramble(word: string): string {
  const letters = Array.from(word);
  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = letters.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [letters[i], letters[j]] = [letters[j] as string, letters[i] as string];
    }
    if (letters.join("") !== word) break;
  }
  return letters.join("");
}

export const randomScrambleWord = () => pick(SCRAMBLE_WORDS);

// ---------------------------------------------------------------------------
// Dictionary for the word-chain game (MIT-licensed `an-array-of-english-words`),
// loaded lazily on first use so it costs nothing unless someone plays.
// ---------------------------------------------------------------------------
let dictionary: Set<string> | null = null;

export function isEnglishWord(word: string): boolean {
  if (!dictionary) {
    const require = createRequire(import.meta.url);
    dictionary = new Set(require("an-array-of-english-words") as string[]);
  }
  return dictionary.has(word);
}

export type ChainResult =
  | { ok: true }
  | { ok: false; reason: "not-a-word" | "wrong-letter" | "used" | "same-player" | "too-short" };

/** Word-chain rule: a real word (3+ letters), starting with the last letter of the previous one, not reused, alternating players. */
export function checkChainWord(
  word: string,
  state: { lastWord: string | null; lastPlayer: string | null; used: ReadonlySet<string> },
  player: string,
): ChainResult {
  if (!/^[a-z]{3,}$/.test(word)) return { ok: false, reason: "too-short" };
  if (state.lastPlayer === player) return { ok: false, reason: "same-player" };
  if (state.lastWord && word[0] !== state.lastWord.at(-1)) return { ok: false, reason: "wrong-letter" };
  if (state.used.has(word)) return { ok: false, reason: "used" };
  if (!isEnglishWord(word)) return { ok: false, reason: "not-a-word" };
  return { ok: true };
}

export const randomStartLetter = () => "abcdefghiklmnoprstw"[randomInt(19)] as string;
