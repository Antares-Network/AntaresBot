/**
 * Achievements are DERIVED from stats the bot already stores; nothing extra is saved.
 */
export interface AchievementInput {
  commandsUsed: number;
  commands: ReadonlyMap<string, number>;
  countingCorrect: number;
  highestLevel: number;
  firstSeenAt: Date | null;
}

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  description: string;
}

const IMAGE_COMMANDS = ["cat", "dog", "fox", "duck", "comic", "apod"];

const DEFINITIONS: (Achievement & { earned: (s: AchievementInput, now: Date) => boolean })[] = [
  { id: "first", emoji: "👋", name: "Hello there", description: "Used your first command", earned: (s) => s.commandsUsed >= 1 },
  { id: "regular", emoji: "⭐", name: "Regular", description: "Used 100 commands", earned: (s) => s.commandsUsed >= 100 },
  { id: "veteran", emoji: "🏅", name: "Veteran", description: "Used 1,000 commands", earned: (s) => s.commandsUsed >= 1000 },
  {
    id: "zoo",
    emoji: "🦊",
    name: "Zookeeper",
    description: "Used every image command",
    earned: (s) => IMAGE_COMMANDS.every((c) => (s.commands.get(c) ?? 0) > 0),
  },
  { id: "oracle", emoji: "🎱", name: "Seeker of Truth", description: "Asked the 8-ball 50 questions", earned: (s) => (s.commands.get("ask") ?? 0) >= 50 },
  { id: "counter", emoji: "🔢", name: "Counter", description: "Counted 100 numbers correctly", earned: (s) => s.countingCorrect >= 100 },
  { id: "mathlete", emoji: "🧮", name: "Number Cruncher", description: "Counted 1,000 numbers correctly", earned: (s) => s.countingCorrect >= 1000 },
  { id: "chatty", emoji: "💬", name: "Chatterbox", description: "Reached level 10 in a server", earned: (s) => s.highestLevel >= 10 },
  { id: "legend", emoji: "👑", name: "Legend", description: "Reached level 50 in a server", earned: (s) => s.highestLevel >= 50 },
  {
    id: "oldtimer",
    emoji: "🕰️",
    name: "Old-timer",
    description: "First used the bot over a year ago",
    earned: (s, now) => !!s.firstSeenAt && now.getTime() - s.firstSeenAt.getTime() >= 365 * 86_400_000,
  },
];

export function achievementsFor(stats: AchievementInput, now = new Date()): Achievement[] {
  return DEFINITIONS.filter((d) => d.earned(stats, now)).map((d) => ({ id: d.id, emoji: d.emoji, name: d.name, description: d.description }));
}

export const ACHIEVEMENT_COUNT = DEFINITIONS.length;
