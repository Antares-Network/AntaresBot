import mongoose, { Schema } from "mongoose";
import { optionalSnowflake, snowflake } from "./shared.js";

const reminderSchema = new Schema(
  {
    userId: { ...snowflake, required: true },
    guildId: optionalSnowflake,
    channelId: optionalSnowflake, // null = deliver by DM
    text: { type: String, required: true, maxlength: 500 },
    dueAt: { type: Date, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "reminders", versionKey: false },
);
reminderSchema.index({ dueAt: 1 });
reminderSchema.index({ userId: 1 });

export const ReminderModel = mongoose.model("Reminder", reminderSchema);
