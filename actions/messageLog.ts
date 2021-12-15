
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
