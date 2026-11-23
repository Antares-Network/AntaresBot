import mongoose, { Schema, type InferSchemaType } from "mongoose";

const botStatsSchema = new Schema(
  {
    _id: { type: String, default: "global" },
    totalMessages: { type: Number, default: 0 },
    totalServers: { type: Number, default: 0 },
    totalUsers: { type: Number, default: 0 },
    guildOwnerIds: { type: [String], default: [] },
    updatedAt: { type: Date, default: null },
  },
  { collection: "bot_stats", versionKey: false },
);

export type BotStatsDoc = InferSchemaType<typeof botStatsSchema>;
export const BotStatsModel = mongoose.model("BotStats", botStatsSchema);
