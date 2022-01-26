import { ICommand } from "wokcommands";

export default {
  category: "owner",
  description: "Sends something in a dm to a user",
  slash: false,
  expectedArgs: "<UserId>",
  minArgs: 1,
  ownerOnly: true,
  guildOnly: false,
  hidden: true,

  callback: ({ client, args, text }) => {
    try {
      client.users.cache.get(args[0])?.send(text);
    } catch (e) {
      console.log(e);
    }
  },
} as ICommand;
