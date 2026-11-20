import mongoose, { Schema } from "mongoose";
import { optionalSnowflake, snowflake } from "./shared.js";

/** Privileged actions (owner/admin commands, dashboard changes). Expires after 90 days. */
const auditSchema = new Schema(
  {
    at: { type: Date, default: () => new Date() },
    guildId: optionalSnowflake,
    actorId: { ...snowflake, required: true },
    actorTag: { type: String, default: "" },
    source: { type: String, enum: ["command", "dashboard"], required: true },
    action: { type: String, required: true, maxlength: 64 },
    details: { type: String, default: "", maxlength: 1000 },
  },
  { collection: "audit_log", versionKey: false },
);
auditSchema.index({ at: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
auditSchema.index({ guildId: 1, at: -1 });

export const AuditModel = mongoose.model("Audit", auditSchema);
