import mongoose, { Schema } from "mongoose";

const GUILD = new Schema({
  id: String,
  GUILD_JOIN_DATE: String,
  GUILD_ID: String,
  GUILD_NAME: String,
  GUILD_OWNER_ID: String,
  GUILD_MEMBER_COUNT: String,
  GUILD_MESSAGES: String,
});
const name = "guilds";

export = mongoose.models[name] || mongoose.model(name, GUILD, name);
