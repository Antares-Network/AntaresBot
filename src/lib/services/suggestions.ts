import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import mongoose from "mongoose";
import { SuggestionModel, type SuggestionStatus } from "../db/models/index.js";
import { nextSeq } from "./servers.js";

export const SUGGESTION_PREFIX = "sg:";

export const STATUS_STYLE: Record<SuggestionStatus, { label: string; color: number }> = {
  open: { label: "🗳️ Open for votes", color: 0x3498db },
  considered: { label: "🤔 Under consideration", color: 0xf1c40f },
  approved: { label: "✅ Approved", color: 0x2ecc71 },
  denied: { label: "❌ Denied", color: 0xe74c3c },
};

export interface SuggestionInfo {
  guildId: string;
  number: number;
  authorId: string | null;
  channelId: string;
  messageId: string | null;
  status: SuggestionStatus;
  up: string[];
  down: string[];
}

export async function createSuggestion(guildId: string, authorId: string, channelId: string): Promise<number> {
  const number = await nextSeq(guildId, "suggestion");
  await SuggestionModel.create({ guildId, number, authorId, channelId });
  return number;
}

export async function attachSuggestionMessage(guildId: string, number: number, messageId: string | null): Promise<void> {
  if (messageId) await SuggestionModel.updateOne({ guildId, number }, { $set: { messageId } });
  else await SuggestionModel.deleteOne({ guildId, number }); // posting failed
}

export async function getSuggestion(guildId: string, number: number): Promise<SuggestionInfo | null> {
  return SuggestionModel.findOne({ guildId, number }).lean<SuggestionInfo>();
}

/**
 * Toggle a vote. Voting the same way again removes the vote; voting the other way moves it.
 * Each step is a single conditional update, so concurrent clicks can't double-count.
 */
export async function voteSuggestion(
  guildId: string,
  number: number,
  userId: string,
  dir: "up" | "down",
): Promise<{ up: number; down: number; mine: "up" | "down" | null } | null> {
  const other = dir === "up" ? "down" : "up";
  const added = await SuggestionModel.findOneAndUpdate(
    { guildId, number, status: mongoose.trusted({ $in: ["open", "considered"] }), [dir]: mongoose.trusted({ $ne: userId }) },
    { $addToSet: { [dir]: userId }, $pull: { [other]: userId } },
    { returnDocument: "after", projection: { up: 1, down: 1 } },
  ).lean();
  if (added) return { up: added.up.length, down: added.down.length, mine: dir };
  const removed = await SuggestionModel.findOneAndUpdate(
    { guildId, number, status: mongoose.trusted({ $in: ["open", "considered"] }), [dir]: userId },
    { $pull: { [dir]: userId } },
    { returnDocument: "after", projection: { up: 1, down: 1 } },
  ).lean();
  return removed ? { up: removed.up.length, down: removed.down.length, mine: null } : null;
}

export async function setSuggestionStatus(guildId: string, number: number, status: SuggestionStatus): Promise<SuggestionInfo | null> {
  return SuggestionModel.findOneAndUpdate({ guildId, number }, { $set: { status } }, { returnDocument: "after" }).lean<SuggestionInfo>();
}

export function voteRow(number: number, up: number, down: number, disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${SUGGESTION_PREFIX}up:${number}`)
      .setEmoji("👍")
      .setLabel(String(up))
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`${SUGGESTION_PREFIX}down:${number}`)
      .setEmoji("👎")
      .setLabel(String(down))
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

export function suggestionEmbed(opts: {
  number: number;
  text: string;
  authorId: string | null;
  status: SuggestionStatus;
  note?: string | null;
}) {
  const st = STATUS_STYLE[opts.status];
  const e = new EmbedBuilder()
    .setColor(st.color)
    .setTitle(`Suggestion #${opts.number}`)
    .setDescription(opts.text)
    .addFields({ name: "Status", value: st.label + (opts.note ? `\n${opts.note}` : "") });
  if (opts.authorId) e.addFields({ name: "Suggested by", value: `<@${opts.authorId}>`, inline: true });
  return e.setTimestamp();
}

/** /remove: drop the user's votes and detach their name from suggestions (the posts stay). */
export async function scrubSuggestionsForUser(userId: string): Promise<void> {
  await SuggestionModel.updateMany({ $or: [{ up: userId }, { down: userId }] }, { $pull: { up: userId, down: userId } });
  await SuggestionModel.updateMany({ authorId: userId }, { $set: { authorId: null } });
}

export async function deleteSuggestionsForGuild(guildId: string): Promise<void> {
  await SuggestionModel.deleteMany({ guildId });
}
