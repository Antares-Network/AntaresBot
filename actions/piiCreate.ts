//Nate Goldsborough
//Antares Network Discord Bot
//This project will morph overtime
//Built for discord.js V.13.1.0
//Project started on December 15, 2020
//Language: typescript
//Path: actions\piiCreate.ts
//Create another entry for a guild when the bot joins it (used to store more private information about each guild)
import { Guild, Client } from "discord.js";
import piiModel from "./../models/pii";

async function event(guild: Guild, client: Client) {
  //get the current Guild ID
  const guildOb = client.guilds.cache.get(guild.id);
  let srv;
  if (guildOb) {
    srv = await piiModel.findOne({ GUILD_ID: guildOb.id }); //find the entry for the guild
  }
  if (srv === null) {
    //create new doc and send all the above information to it
    const doc = new piiModel({
      GUILD_ID: guild.id,
      GUILD_NAME: guild.name,
      GUILD_COMMAND_COUNT: 0,
      GUILD_DEFAULT_CHANNEL: null,
      GUILD_ADMIN_CHANNEL: null,
      CONFESSION_CHANNEL_ID: null,
      CONFESSION_CHANNEL_CODE: null,
      GUILD_COUNTING_CHANNEL_ID: null,
      GUILD_COUNTING_NUMBER: 0,
      GUILD_WELCOME_ENABLED: false,
      GUILD_WELCOME_CHANNEL: null,
      GUILD_WELCOME_MESSAGE: null,
      GUILD_POLL_TIMEOUT: null,
    });
    await doc.save();
  }
}

export = { event };
