import { ICommand } from "wokcommands";

export default {
  category: "user",
  description: "Request deletion of all data from our servers.",
  slash: true,
  testOnly: false,
  guildOnly: false,
  permissions: ["SEND_MESSAGES"],

  callback: async ({ interaction }) => {
    interaction.reply(
      "No per user data is stored on our servers.\nIf you are a server owner and would like your data deleted, kick the bot from your server as all data is deleted upon the bot leaving the server."
    );
  },
} as ICommand;
