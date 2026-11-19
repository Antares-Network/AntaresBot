import type { User } from "discord.js";
import { UserModel } from "../db/models.js";
import { WriteBuffer } from "../db/writeBuffer.js";
import { toCount, toSnowflake } from "../util.js";

export interface UserProfile {
  id: string;
  username: string;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  commandsUsed: number;
  commands: ReadonlyMap<string, number>;
  topCommands: { name: string; uses: number }[];
  countingCorrect: number;
  countingMistakes: number;
  lastCommandAt: Date | null;
  privateProfile: boolean;
}

/** Command names become document keys, so only allow safe identifiers ($ and . are not). */
const SAFE_KEY = /^[a-z0-9_-]{1,32}$/;

// Activity is buffered and flushed with the other buffered writes (every 30s + shutdown),
// so recording stats never slows down a command. Upserts create the user's document.
const activity = new WriteBuffer("user-activity", UserModel as never, { upsert: true });

function touch(user: User, now: Date) {
  return {
    set: { username: user.username, lastSeenAt: now },
    setOnInsert: { firstSeenAt: now, "preferences.privateProfile": false },
  };
}

export function recordCommand(user: User, commandName: string): void {
  if (user.bot) return;
  const now = new Date();
  const inc: Record<string, number> = { "stats.commandsUsed": 1 };
  if (SAFE_KEY.test(commandName)) inc[`stats.commands.${commandName}`] = 1;
  const t = touch(user, now);
  activity.add(user.id, { inc, set: { ...t.set, "stats.lastCommandAt": now }, setOnInsert: t.setOnInsert });
}

export function recordCount(user: User, correct: boolean): void {
  if (user.bot) return;
  const t = touch(user, new Date());
  activity.add(user.id, { inc: { [correct ? "stats.countingCorrect" : "stats.countingMistakes"]: 1 }, ...t });
}

export function flushUserActivity(): Promise<number> {
  return activity.flush();
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  // Make sure buffered activity is visible to the person looking at it.
  await activity.flush().catch(() => undefined);
  const doc = await UserModel.findById(userId).lean();
  if (!doc) return null;
  const date = (v: unknown) => (v instanceof Date && !Number.isNaN(v.getTime()) ? v : null);
  const commands = doc.stats?.commands as unknown;
  const entries: [string, unknown][] =
    commands instanceof Map
      ? [...(commands as Map<string, unknown>)]
      : commands && typeof commands === "object"
        ? Object.entries(commands)
        : [];
  return {
    id: toSnowflake(doc._id) ?? userId,
    username: typeof doc.username === "string" ? doc.username : "",
    firstSeenAt: date(doc.firstSeenAt),
    lastSeenAt: date(doc.lastSeenAt),
    commandsUsed: toCount(doc.stats?.commandsUsed),
    commands: new Map(entries.map(([name, uses]) => [name, toCount(uses)])),
    topCommands: entries
      .map(([name, uses]) => ({ name, uses: toCount(uses) }))
      .filter((c) => c.uses > 0)
      .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name))
      .slice(0, 5),
    countingCorrect: toCount(doc.stats?.countingCorrect),
    countingMistakes: toCount(doc.stats?.countingMistakes),
    lastCommandAt: date(doc.stats?.lastCommandAt),
    privateProfile: doc.preferences?.privateProfile === true,
  };
}

/** Set the privateProfile preference (creates the user's document if needed). */
export async function setPrivateProfile(user: User, value: boolean): Promise<void> {
  const now = new Date();
  await activity.flush().catch(() => undefined);
  await UserModel.updateOne(
    { _id: user.id },
    {
      $set: { "preferences.privateProfile": value, username: user.username, lastSeenAt: now },
      $setOnInsert: { firstSeenAt: now },
    },
    { upsert: true },
  );
}

/** /remove: delete everything stored about this user, including unflushed activity. */
export async function deleteUserData(userId: string): Promise<boolean> {
  // Wait out any in-flight flush first, so a buffered upsert can't recreate the document.
  await activity.forget(userId);
  const res = await UserModel.deleteOne({ _id: userId });
  return res.deletedCount > 0;
}
