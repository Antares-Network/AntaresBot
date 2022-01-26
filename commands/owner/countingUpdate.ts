import { ICommand } from "wokcommands";
import piiModel from "../../models/pii";

export default {
  category: "owner",
  description: "Updates the counting channel db's",
  slash: false,
  ownerOnly: true,
  guildOnly: true,
  hidden: true,

  callback: ({ client }) => {

    client.guilds.cache.forEach(async (guild) => {
      const chan = await guild?.channels.cache.find(
        (c) => c?.name.includes("counting") && c?.type === "GUILD_TEXT"
      );
      if(chan) {
        console.log(`${chan.id} ${chan.guild.name}`);
        await piiModel.updateOne(
          { GUILD_ID: guild?.id },
          { GUILD_COUNTING_CHANNEL_ID: chan.id }
        );
        console.log(`Updated ${guild.name}`);
      }
    });
  }
} as ICommand;