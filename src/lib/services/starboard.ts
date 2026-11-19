import { StarboardModel } from "../db/models.js";

export interface StarEntry {
  starboardMessageId: string | null;
  stars: number;
}

/**
 * Record the latest star count for a message and return its entry. `claim` is true for
 * exactly ONE caller when no starboard copy exists yet, so racing reaction events can't
 * post the same message twice.
 */
export async function updateStars(
  messageId: string,
  guildId: string,
  channelId: string,
  stars: number,
): Promise<{ entry: StarEntry; claim: boolean }> {
  const before = await StarboardModel.findOneAndUpdate(
    { _id: messageId },
    { $set: { stars }, $setOnInsert: { guildId, channelId, starboardMessageId: null } },
    { upsert: true, returnDocument: "before" },
  ).lean();
  const existing = before?.starboardMessageId ?? null;
  if (existing === PENDING) return { entry: { starboardMessageId: null, stars }, claim: false }; // another event is posting
  if (existing) return { entry: { starboardMessageId: existing, stars }, claim: false };
  // Claim the right to post by flipping null -> PENDING atomically.
  const res = await StarboardModel.updateOne(
    { _id: messageId, starboardMessageId: null },
    { $set: { starboardMessageId: PENDING } },
  );
  return { entry: { starboardMessageId: null, stars }, claim: res.modifiedCount === 1 };
}

/** Marker meaning "a starboard post is being created right now". */
const PENDING = "0";

export async function setStarboardMessage(messageId: string, starboardMessageId: string | null): Promise<void> {
  await StarboardModel.updateOne({ _id: messageId }, { $set: { starboardMessageId } });
}

export async function deleteStarboardForGuild(guildId: string): Promise<void> {
  await StarboardModel.deleteMany({ guildId });
}
