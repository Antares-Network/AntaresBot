//Nate Goldsborough
//Antares Network Discord Bot
//This project will morph overtime
//Built for discord.js V.13.1.0
//Project started on December 15, 2020
//Language: typescript
//Path: actions\messageLog.ts
//This event fires to increase the total message count for the guild it was sent from
import { Message } from "discord.js";
import guildModel from "./../models/guild";

async function log(message: Message) {
  const req = await guildModel.findOne({ GUILD_ID: message.guild?.id });
  const doc = await guildModel.findOneAndUpdate(
    { GUILD_ID: message.guild?.id },
    { $set: { GUILD_MESSAGES: parseInt(req.GUILD_MESSAGES) + 1 } },
    { new: true }
  );
  await doc.save();
}

export = { log };
