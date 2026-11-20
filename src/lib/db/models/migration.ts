import mongoose, { Schema } from "mongoose";

const migrationSchema = new Schema(
  {
    _id: { type: String, required: true },
    ranAt: { type: Date, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { collection: "migrations", versionKey: false },
);

export const MigrationModel = mongoose.model("Migration", migrationSchema);
