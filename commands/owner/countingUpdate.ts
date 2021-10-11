import { ICommand } from "wokcommands";
import piiModel from "../../models/pii";

export default {
  category: "owner",
  description: "Updates the counting channel db's",
  slash: false,
  ownerOnly: true,
  hidden: true,
  guildOnly: true,

  callback: ({ client, channel }) => {
    client.guilds.cache.forEach(async (guild) => {
      let req = await piiModel.findOne({ GUILD_ID: guild.id });
      let chan = guild?.channels.cache.find(
        (c) => c?.name.includes("counting") && c?.type === "GUILD_TEXT"
      );
      channel.send(chan?.id+" "+chan?.guild.name);
      channel.send(req?.GUILD_COUNTING_CHANNEL_ID);

      if (req.GUILD_COUNTING_CHANNEL_ID == null) {
        channel.send("No counting channel found for " +guild.name);
        if (chan) {
          await piiModel.findOneAndUpdate(
            { GUILD_ID: guild.id },
            { $set: { GUILD_COUNTING_CHANNEL_ID: chan.id } },
            { new: true }
          );
          channel.send(`Updated ${guild.name}`);
        }
      }
    });
  }
} as ICommand;
