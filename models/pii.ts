//Nate Goldsborough
//Antares Network Discord Bot
//This project will morph overtime
//built for discord.js V.12.5.1

import mongoose, { Schema } from "mongoose";

const PII = new Schema({
  id: String,
  GUILD_ID: String,
  GUILD_NAME: String,
  GUILD_DEFAULT_CHANNEL: String,
  GUILD_ADMIN_CHANNEL: String,
  CONFESSION_CHANNEL_ID: String,
  GUILD_COUNTING_CHANNEL_ID: String,
  GUILD_COUNTING_NUMBER: String,
  GUILD_POLL_TIMEOUT: String,
});

const name = "piis";

export = mongoose.models[name] || mongoose.model(name, PII, name);
