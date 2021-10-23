import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";

export default {
  name: "r",
  category: "user",
  description: "Does nothing",
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, message }) => {
    if (await check.check(message, client)) {
      return "https://playantares.com/snips"
    }
  }
} as ICommand;
