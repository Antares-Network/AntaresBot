import mongoose, { Schema } from "mongoose";
import { optionalSnowflake, snowflake } from "./shared.js";

/** Original message -> its starboard copy, so star counts update instead of duplicating. */
const starboardSchema = new Schema(
  {
    _id: { ...snowflake, required: true }, // original message ID
    guildId: { ...snowflake, required: true },
    channelId: { ...snowflake, required: true },
    starboardMessageId: optionalSnowflake,
    stars: { type: Number, default: 0 },
  },
  { collection: "starboard", versionKey: false },
);
starboardSchema.index({ guildId: 1 });

export const StarboardModel = mongoose.model("Starboard", starboardSchema);
