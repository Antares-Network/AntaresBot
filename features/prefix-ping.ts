import { Client } from "discord.js";
import WOKCommands from "wokcommands";

export default (client: Client, instance: WOKCommands) => {
  client.on("messageCreate", async (message) => {
    if (message.member?.user.bot) return;
    if (message.author.bot) return;
    if (message.content === `<@!${client.user?.id}>`) {
      const prefix =
        instance.getPrefix(message.guild) || instance.defaultPrefix;
      message.reply({ content: `The prefix for this guild is: ${prefix}` });
    }
  });
};

export const config = {
  dbName: "PREFIX_PING",
  displayName: "Prefix Ping",
};