import mongoose, { Schema } from "mongoose";
import { DEFAULT_INTERVAL_SEC, MAX_INTERVAL_SEC, MAX_ROTATION, MAX_STATUS_LENGTH, MIN_INTERVAL_SEC } from "../../features/presence.js";

export const STATUS_TYPES = ["playing", "watching", "listening", "competing", "custom"] as const;
export type StatusType = (typeof STATUS_TYPES)[number];

const statusEntrySchema = new Schema(
  {
    text: { type: String, required: true, maxlength: MAX_STATUS_LENGTH },
    type: { type: String, enum: STATUS_TYPES, default: "playing" },
  },
  { _id: false },
);

/** Bot-wide owner settings. The status rotation is edited with /setstatus and survives restarts. */
const botConfigSchema = new Schema(
  {
    _id: { type: String, default: "global" },
    /** Null until first edited: the built-in default rotation is used. */
    statusRotation: {
      type: [statusEntrySchema],
      default: null,
      validate: { validator: (v: unknown[] | null) => v == null || v.length <= MAX_ROTATION, message: `At most ${MAX_ROTATION} statuses.` },
    },
    statusIntervalSec: { type: Number, default: DEFAULT_INTERVAL_SEC, min: MIN_INTERVAL_SEC, max: MAX_INTERVAL_SEC },
    /** A pinned status pauses the rotation. */
    statusPinned: { type: statusEntrySchema, default: null },
    /** Compare-and-set revision for edits. */
    rev: { type: Number, default: 0 },
  },
  { collection: "bot_config", versionKey: false },
);

export const BotConfigModel = mongoose.model("BotConfig", botConfigSchema);
