import mongoose, { Schema } from "mongoose";
import { snowflake } from "./shared.js";

export const GATE_KINDS = ["user", "guild", "owner", "ignored_guild"] as const;
export type GateKind = (typeof GATE_KINDS)[number];

const gateEntrySchema = new Schema(
  {
    _id: { type: String, required: true }, // "<kind>:<targetId>"
    kind: { type: String, enum: GATE_KINDS, required: true },
    targetId: { ...snowflake, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "gate_entries", versionKey: false },
);
gateEntrySchema.index({ kind: 1 });

export const GateEntryModel = mongoose.model("GateEntry", gateEntrySchema);

export const gateEntryId = (kind: GateKind, targetId: string) => `${kind}:${targetId}`;
