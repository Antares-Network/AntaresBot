//Nate Goldsborough
//Antares Network Discord Bot
//This project will morph overtime
//Built for discord.js V.13.1.0
//Project started on December 15, 2020
//Language: typescript
//Path: actions\gateCreate.ts
//This file will create the gate document in the database (Used for storing global data about the bot)
import { Client } from "discord.js";
import gateModel from "./../models/gate";
import guildModel from "./../models/guild";

function event(client: Client) {
  //var init and gc
  let totalUsers = 0;
  let totalMessages = 0;
  let totalOwners: String[] = [];

  //loop thru the guilds and add the owners, member numbers and messages to their vars to be added to the db
  client.guilds.cache.forEach(async (guild) => {
    const doc = await guildModel.findOne({ GUILD_ID: guild.id }); //find the doc that has all the guild information in it
    totalMessages += Number(doc.GUILD_MESSAGES);
    totalOwners.push(guild.ownerId);
    totalUsers += guild.memberCount;
  });

  //make it pause 5 seconds before saving to the database because then the stuff above has time to finish processing
  setTimeout(async () => {
    const gate = new gateModel({
      NAME: "GATE",
      GUILD_OWNER_ID: totalOwners,
      BANNED_OWNERS: [],
      BANNED_USERS: [],
      BANNED_GUILDS: [],
      TOTAL_MESSAGES: totalMessages,
      TOTAL_SERVERS: client.guilds.cache.size,
      TOTAL_USERS: totalUsers,
      IGNORED_GUILDS: null,
      UPDATE_TIME: null,
    });
    //upload db file to the db remote server
    await gate.save();
  }, 5000);
}

export = { event };
