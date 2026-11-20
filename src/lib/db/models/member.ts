import mongoose, { Schema } from "mongoose";
import { snowflake } from "./shared.js";

/** Per-server, per-member stats: XP/levels and the server's counting leaderboard. */
const memberSchema = new Schema(
  {
    _id: { type: String, required: true }, // "<guildId>:<userId>"
    guildId: { ...snowflake, required: true },
    userId: { ...snowflake, required: true },
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 0, min: 0 },
    countingCorrect: { type: Number, default: 0, min: 0 },
    countingMistakes: { type: Number, default: 0, min: 0 },
    /** Birthday (month/day only, never the year), set by the member in this server. */
    birthdayMonth: { type: Number, default: null, min: 1, max: 12 },
    birthdayDay: { type: Number, default: null, min: 1, max: 31 },
  },
  { collection: "members", versionKey: false },
);
memberSchema.index({ guildId: 1, xp: -1 });
memberSchema.index({ guildId: 1, countingCorrect: -1 });
memberSchema.index({ userId: 1 });
memberSchema.index({ guildId: 1, birthdayMonth: 1, birthdayDay: 1 }, { partialFilterExpression: { birthdayMonth: { $gte: 1 } } });

export const MemberModel = mongoose.model("Member", memberSchema);

export const memberId = (guildId: string, userId: string) => `${guildId}:${userId}`;
