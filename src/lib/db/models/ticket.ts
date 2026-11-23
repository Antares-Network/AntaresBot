import mongoose, { Schema } from "mongoose";
import { optionalSnowflake, snowflake } from "./shared.js";

const ticketSchema = new Schema(
  {
    guildId: { ...snowflake, required: true },
    number: { type: Number, required: true, min: 1 },
    openerId: { ...snowflake, required: true },
    channelId: optionalSnowflake,
    status: { type: String, enum: ["open", "closed"], default: "open" },
    openedAt: { type: Date, default: () => new Date() },
    closedAt: { type: Date, default: null },
    closedBy: optionalSnowflake,
  },
  { collection: "tickets", versionKey: false },
);
ticketSchema.index({ guildId: 1, number: 1 }, { unique: true });
ticketSchema.index({ guildId: 1, openerId: 1, status: 1 });
ticketSchema.index({ channelId: 1 });

export const TicketModel = mongoose.model("Ticket", ticketSchema);
