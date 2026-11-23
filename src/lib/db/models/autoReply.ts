import mongoose, { Schema } from "mongoose";
import { snowflake } from "./shared.js";

const autoReplySchema = new Schema(
  {
    guildId: { ...snowflake, required: true },
    trigger: { type: String, required: true, maxlength: 100 }, // stored lower-cased
    match: { type: String, enum: ["exact", "contains", "word"], required: true },
    response: { type: String, required: true, maxlength: 500 },
    createdBy: { ...snowflake, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "autoreplies", versionKey: false },
);
autoReplySchema.index({ guildId: 1, trigger: 1 }, { unique: true });

export const AutoReplyModel = mongoose.model("AutoReply", autoReplySchema);
