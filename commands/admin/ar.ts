import { ICommand } from "wokcommands";

export default {
  name: "ar",
  category: "admin",
  description: "Does nothing",
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ message }) => {
    message.delete();
    return "https://playantares.com/snips"
  }
} as ICommand;
