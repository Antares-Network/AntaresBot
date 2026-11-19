import { randomInt } from "node:crypto";
import type { Message, SendableChannels } from "discord.js";
import { escapeMarkdown } from "discord.js";
import { z } from "zod";
import { fetchJson } from "../http.js";
import { checkChainWord, randomScrambleWord, randomStartLetter, scramble } from "../features/words.js";

/**
 * In-memory chat games (one per channel). Message content is only inspected while a game
 * is running in that channel, and nothing typed is stored.
 */
export interface Game {
  readonly kind: "trivia" | "scramble" | "wordchain";
  /** Return true if the message was a game move (the listener then stops processing it). */
  handle(message: Message<true>): Promise<boolean>;
  stop(reason: "timeout" | "stopped" | "won" | "shutdown"): Promise<void>;
}

const games = new Map<string, Game>();

export const activeGame = (channelId: string) => games.get(channelId);

function register(channelId: string, game: Game) {
  games.set(channelId, game);
}
function unregister(channelId: string, game: Game) {
  if (games.get(channelId) === game) games.delete(channelId);
}

export async function stopAllGames(): Promise<void> {
  await Promise.allSettled([...games.values()].map((g) => g.stop("shutdown")));
  games.clear();
}

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// ---------------------------------------------------------------------------
// Trivia (Open Trivia DB, url-encoded so no HTML entities to decode)
// ---------------------------------------------------------------------------
const TriviaResponse = z.object({
  response_code: z.literal(0),
  results: z
    .array(
      z.object({
        category: z.string(),
        difficulty: z.string(),
        question: z.string(),
        correct_answer: z.string(),
        incorrect_answers: z.array(z.string()).length(3),
      }),
    )
    .length(1),
});

export interface TriviaQuestion {
  category: string;
  difficulty: string;
  question: string;
  options: string[]; // 4, shuffled
  answerIndex: number;
}

export async function fetchTriviaQuestion(): Promise<TriviaQuestion> {
  const data = await fetchJson("https://opentdb.com/api.php?amount=1&type=multiple&encode=url3986", TriviaResponse);
  const q = data.results[0];
  if (!q) throw new Error("no trivia question");
  const dec = (s: string) => decodeURIComponent(s);
  const options = [q.correct_answer, ...q.incorrect_answers].map(dec);
  for (let i = options.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [options[i], options[j]] = [options[j] as string, options[i] as string];
  }
  return {
    category: dec(q.category),
    difficulty: dec(q.difficulty),
    question: dec(q.question),
    options,
    answerIndex: options.indexOf(dec(q.correct_answer)),
  };
}

const LETTERS = ["A", "B", "C", "D"] as const;

export function startTrivia(channel: SendableChannels & { id: string }, q: TriviaQuestion, timeoutMs = 30_000): Game {
  const guessed = new Set<string>();
  let done = false;
  const answer = `${LETTERS[q.answerIndex]}) ${q.options[q.answerIndex]}`;

  const game: Game = {
    kind: "trivia",
    async handle(message) {
      if (done) return false;
      const text = norm(message.content);
      const letter = /^[abcd]$/.test(text) ? "abcd".indexOf(text) : q.options.findIndex((o) => norm(o) === text);
      if (letter === -1) return false; // ordinary chat, not a guess
      if (guessed.has(message.author.id)) {
        await message.react("⏳").catch(() => undefined);
        return true;
      }
      guessed.add(message.author.id);
      if (letter === q.answerIndex) {
        await message.reply({ content: `🎉 Correct! The answer was **${escapeMarkdown(answer)}**.`, allowedMentions: { repliedUser: false } });
        await game.stop("won");
      } else {
        await message.react("❌").catch(() => undefined);
      }
      return true;
    },
    async stop(reason) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unregister(channel.id, game);
      if (reason === "timeout") await channel.send(`⏰ Time's up! The answer was **${escapeMarkdown(answer)}**.`).catch(() => undefined);
    },
  };
  const timer = setTimeout(() => void game.stop("timeout"), timeoutMs);
  register(channel.id, game);
  return game;
}

// ---------------------------------------------------------------------------
// Scramble
// ---------------------------------------------------------------------------
export function startScramble(channel: SendableChannels & { id: string }, timeoutMs = 45_000): { game: Game; scrambled: string } {
  const word = randomScrambleWord();
  const scrambled = scramble(word);
  let done = false;
  const game: Game = {
    kind: "scramble",
    async handle(message) {
      if (done || norm(message.content) !== word) return false;
      await message.reply({ content: `🎉 You got it! The word was **${word}**.`, allowedMentions: { repliedUser: false } });
      await game.stop("won");
      return true;
    },
    async stop(reason) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unregister(channel.id, game);
      if (reason === "timeout") await channel.send(`⏰ Nobody got it! The word was **${word}**.`).catch(() => undefined);
    },
  };
  const timer = setTimeout(() => void game.stop("timeout"), timeoutMs);
  register(channel.id, game);
  return { game, scrambled };
}

// ---------------------------------------------------------------------------
// Word chain
// ---------------------------------------------------------------------------
export function startWordChain(channel: SendableChannels & { id: string }, idleMs = 120_000): { game: Game; letter: string } {
  const letter = randomStartLetter();
  const used = new Set<string>();
  const players = new Map<string, number>();
  let lastWord: string | null = null;
  let lastPlayer: string | null = null;
  let done = false;
  let timer = setTimeout(() => void game.stop("timeout"), idleMs);

  const game: Game = {
    kind: "wordchain",
    async handle(message) {
      if (done) return false;
      const word = message.content.trim().toLowerCase();
      if (!/^[a-z]+$/.test(word)) return false; // only single plain words are plays
      if (!lastWord && word[0] !== letter) {
        await message.react("❌").catch(() => undefined);
        return true;
      }
      const result = checkChainWord(word, { lastWord, lastPlayer, used }, message.author.id);
      if (!result.ok) {
        await message.react(result.reason === "same-player" ? "⏳" : "❌").catch(() => undefined);
        return true;
      }
      used.add(word);
      lastWord = word;
      lastPlayer = message.author.id;
      players.set(message.author.id, (players.get(message.author.id) ?? 0) + 1);
      await message.react("✅").catch(() => undefined);
      clearTimeout(timer);
      timer = setTimeout(() => void game.stop("timeout"), idleMs);
      return true;
    },
    async stop(reason) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unregister(channel.id, game);
      if (reason === "shutdown") return;
      const top = [...players]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, n], i) => `${["🥇", "🥈", "🥉"][i] ?? ""} <@${id}> — ${n}`)
        .join("\n");
      await channel
        .send({
          content: `🔗 Word chain over! Chain length: **${used.size}**${top ? `\n${top}` : ""}`,
          allowedMentions: { parse: [] },
        })
        .catch(() => undefined);
    },
  };
  register(channel.id, game);
  return { game, letter };
}
