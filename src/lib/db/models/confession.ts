import mongoose, { Schema } from "mongoose";
import { optionalSnowflake, snowflake } from "./shared.js";

/**
 * Anonymous confessions. The author is stored only as an HMAC of (guild, user) under a
 * server-side secret: moderators can block a confessor by confession number without
 * anyone (including the database) learning who they are.
 */
const confessionSchema = new Schema(
  {
    guildId: { ...snowflake, required: true },
    number: { type: Number, required: true },
    authorHash: { type: String, required: true },
    messageId: optionalSnowflake,
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "confessions", versionKey: false },
);
confessionSchema.index({ guildId: 1, number: 1 }, { unique: true });

export const ConfessionModel = mongoose.model("Confession", confessionSchema);
