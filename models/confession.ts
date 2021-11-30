import mongoose, { Schema } from "mongoose";

const CONFESSION = new Schema({
  id: String,
  DATE: String,
  USER_ID: String,
  PRIVATE_USER_ID: String,
  CONFESSION_ID: String,
  CONFESSION_LINK: String
});

const name = "confession";

export = mongoose.models[name] || mongoose.model(name, CONFESSION, name);