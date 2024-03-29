import { Client } from "discord.js";
import { ICommand } from "wokcommands";

const setStatus = (client: Client, status: string) => {
  client.user?.setPresence({
    status: "online",
    activities: [
      {
        name: status,
      },
    ],
  });
};

export default {
  // Best practice for the built-in help menu
  category: "owner",
  description: "Updates the status for the bot",
  slash: false,
  minArgs: 1,
  expectedArgs: "<status>",
  ownerOnly: true,
  hidden: true,

  // This method is invoked anytime the command is ran
  callback: ({ client, text, message }) => {
    setStatus(client, text);
    message.reply({
      content: "Status updated successfully",
    });
  },
} as ICommand;
