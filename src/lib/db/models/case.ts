import mongoose, { Schema } from "mongoose";
import { snowflake } from "./shared.js";

export const CASE_TYPES = ["warn", "automod", "timeout", "kick", "note"] as const;
export type CaseType = (typeof CASE_TYPES)[number];

/** Moderation cases. Kept when a member runs /remove (moderation record); deleted with the server. */
const caseSchema = new Schema(
  {
    guildId: { ...snowflake, required: true },
    number: { type: Number, required: true, min: 1 },
    userId: { ...snowflake, required: true },
    moderatorId: { ...snowflake, required: true },
    type: { type: String, enum: CASE_TYPES, required: true },
    reason: { type: String, default: "", maxlength: 500 },
    /** False once pardoned: still listed, no longer counts toward escalation. */
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "cases", versionKey: false },
);
caseSchema.index({ guildId: 1, number: 1 }, { unique: true });
caseSchema.index({ guildId: 1, userId: 1, createdAt: -1 });

export const CaseModel = mongoose.model("Case", caseSchema);
