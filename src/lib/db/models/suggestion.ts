import mongoose, { Schema } from "mongoose";
import { optionalSnowflake, snowflake } from "./shared.js";

export const SUGGESTION_STATUSES = ["open", "considered", "approved", "denied"] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

const suggestionSchema = new Schema(
  {
    guildId: { ...snowflake, required: true },
    number: { type: Number, required: true, min: 1 },
    /** Null after the author runs /remove. */
    authorId: optionalSnowflake,
    channelId: { ...snowflake, required: true },
    messageId: optionalSnowflake,
    status: { type: String, enum: SUGGESTION_STATUSES, default: "open" },
    up: { type: [String], default: [] },
    down: { type: [String], default: [] },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "suggestions", versionKey: false },
);
suggestionSchema.index({ guildId: 1, number: 1 }, { unique: true });
suggestionSchema.index({ up: 1 });
suggestionSchema.index({ down: 1 });

export const SuggestionModel = mongoose.model("Suggestion", suggestionSchema);
