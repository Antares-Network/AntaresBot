import mongoose from "mongoose";
import { ReminderModel } from "../db/models/index.js";

export const MAX_REMINDERS_PER_USER = 25;

export interface ReminderView {
  id: string;
  text: string;
  dueAt: Date;
  channelId: string | null;
}

export class ReminderLimitError extends Error {}

export async function createReminder(input: {
  userId: string;
  guildId: string | null;
  channelId: string | null;
  text: string;
  dueAt: Date;
}): Promise<ReminderView> {
  const pending = await ReminderModel.countDocuments({ userId: input.userId });
  if (pending >= MAX_REMINDERS_PER_USER) throw new ReminderLimitError();
  const doc = await ReminderModel.create({ ...input, text: input.text.slice(0, 500) });
  return { id: String(doc._id), text: doc.text, dueAt: doc.dueAt, channelId: doc.channelId ?? null };
}

export async function listReminders(userId: string): Promise<ReminderView[]> {
  const docs = await ReminderModel.find({ userId }).sort({ dueAt: 1 }).limit(MAX_REMINDERS_PER_USER).lean();
  return docs.map((d) => ({ id: String(d._id), text: d.text, dueAt: d.dueAt, channelId: d.channelId ?? null }));
}

/** Only the owner of a reminder can cancel it. */
export async function cancelReminder(userId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f]{24}$/.test(id)) return false;
  const res = await ReminderModel.deleteOne({ _id: id, userId });
  return res.deletedCount === 1;
}

export interface DueReminder {
  id: string;
  userId: string;
  guildId: string | null;
  channelId: string | null;
  text: string;
  createdAt: Date;
}

/**
 * Atomically claim reminders that are due: each is deleted as it's taken, so a reminder
 * is delivered at most once even if two deliveries overlap.
 */
export async function claimDueReminders(now = new Date(), max = 50): Promise<DueReminder[]> {
  const claimed: DueReminder[] = [];
  for (let i = 0; i < max; i++) {
    const d = await ReminderModel.findOneAndDelete({ dueAt: mongoose.trusted({ $lte: now }) }, { sort: { dueAt: 1 } }).lean();
    if (!d) break;
    claimed.push({
      id: String(d._id),
      userId: d.userId,
      guildId: d.guildId ?? null,
      channelId: d.channelId ?? null,
      text: d.text,
      createdAt: d.createdAt,
    });
  }
  return claimed;
}

export async function deleteRemindersForUser(userId: string): Promise<number> {
  return (await ReminderModel.deleteMany({ userId })).deletedCount;
}

export async function deleteRemindersForGuild(guildId: string): Promise<void> {
  // Channel reminders in a server we left can't be delivered there; DM ones (guildId null) are kept.
  await ReminderModel.updateMany({ guildId }, { $set: { guildId: null, channelId: null } });
}
