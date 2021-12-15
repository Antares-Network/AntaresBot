import { ICommand } from "wokcommands";

export default {
  category: "owner",
  description: "Forces the bot to leave a server",
  slash: true,
  expectedArgs: "<serverid>",
  minArgs: 1,
  ownerOnly: true,
  hidden: true,
  
  callback: ({ client, message, channel, args }) => {
    const server = client.guilds.cache.get(args[0]);
    if (server) {
      channel.send(
        `I have been forced to leave a server by the name \`${server.name}\`, and ID: \`${args[0]}\` by<@${message.author.id}>`
      );
      server.leave();
    } else {
      channel.send(
        `I was unable to leave a server by the name \`${args[0]}\` and ID: \`${args[0]}\``
      );
    }
  },
} as ICommand;
