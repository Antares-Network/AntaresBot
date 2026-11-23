import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { optionalSnowflake, snowflake } from "./shared.js";

const serverSchema = new Schema(
  {
    _id: { ...snowflake, required: true },
    name: { type: String, default: "" },
    ownerId: optionalSnowflake, // refreshed from Discord on every startup
    iconUrl: { type: String, default: null },
    memberCount: { type: Number, default: 0, min: 0 },
    messageCount: { type: Number, default: 0, min: 0 },
    /** null = unknown (some v1 records had no join date); filled in by syncServers from Discord. */
    joinedAt: { type: Date, default: null },
    channels: {
      bot: optionalSnowflake,
      admin: optionalSnowflake,
      counting: optionalSnowflake,
    },
    counting: {
      current: { type: Number, default: 0, min: 0 },
      highScore: { type: Number, default: 0, min: 0 },
      /** "Reset" mode only: each save forgives one mistake. Earned every 100 counts. */
      saves: { type: Number, default: 0, min: 0 },
    },
    /**
     * Feature settings (levels, welcome, automod, ...). Validated by the zod schema in
     * services/settings.ts on every read and write, which is the single source of truth.
     */
    settings: { type: Schema.Types.Mixed, default: {} },
    /** Per-section revision numbers for compare-and-set updates of `settings`. */
    settingsRev: { type: Schema.Types.Mixed, default: {} },
    /** Per-server sequence numbers, allocated atomically with $inc. */
    seq: {
      case: { type: Number, default: 0, min: 0 },
      suggestion: { type: Number, default: 0, min: 0 },
      ticket: { type: Number, default: 0, min: 0 },
    },
    /** Birthday task state: the local date last announced, and who holds the role today. */
    birthdayState: { lastDate: { type: String, default: null }, roleHolders: { type: [String], default: [] } },
  },
  { collection: "servers", versionKey: false, timestamps: { createdAt: false, updatedAt: true }, minimize: false },
);

export type ServerDoc = InferSchemaType<typeof serverSchema>;
export const ServerModel = mongoose.model("Server", serverSchema);
