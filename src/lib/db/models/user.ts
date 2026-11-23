import mongoose, { Schema } from "mongoose";
import { snowflake } from "./shared.js";

/**
 * One document per user who has interacted with the bot (ran a command or counted).
 * Users who merely chat in a server are never stored. Deleted by /remove.
 */
const userSchema = new Schema(
  {
    _id: { ...snowflake, required: true },
    username: { type: String, default: "" },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    stats: {
      commandsUsed: { type: Number, default: 0, min: 0 },
      /** Per-command usage, e.g. { cat: 12, ask: 3 } (what v1 sent to Statcord). */
      commands: { type: Map, of: Number, default: () => new Map() },
      countingCorrect: { type: Number, default: 0, min: 0 },
      countingMistakes: { type: Number, default: 0, min: 0 },
      lastCommandAt: { type: Date, default: null },
    },
    preferences: {
      /** Hide this user's /profile from everyone else. */
      privateProfile: { type: Boolean, default: false },
    },
  },
  { collection: "users", versionKey: false },
);

export const UserModel = mongoose.model("User", userSchema);
