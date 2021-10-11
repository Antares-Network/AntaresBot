import { TextChannel } from "discord.js";
import { ICommand } from "wokcommands";

export default {
  category: "admin",
  description: "Makes the bot say something",
  aliases: ["echo"],
  slash: false,
  expectedArgs: "<channel>",
  minArgs: 1,
  permissions: ["MANAGE_MESSAGES"],
  guildOnly: true,

  callback: ({ client, message, args, text }) => {
    message.delete();

    const id = message.mentions.channels.first()?.id;
    if (id) {
      const mentionedChannel = client.channels.cache.get(id) as TextChannel;
      try {
        mentionedChannel.send(text.replace(args[0], ""));
      } catch (e) {
        message.channel.send(`Error: ${e}`);
      }
    } else {
      message.channel.send(text);
    }
  },
} as ICommand;
