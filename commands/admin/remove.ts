import { ICommand } from "wokcommands";
import adminChanCheck from "../../functions/adminChanCheck";

export default {
  category: "admin",
  description: "Request deletion of all data from our servers.",
  slash: false,
  guildOnly: true,
  permissions: ["ADMINISTRATOR"],

  callback: async ({ client, message }) => {
    if (await adminChanCheck.check(message, client)) {
      message.reply(
        "If you would like to request that all your data be removed from our servers, please DM @nathen418#0002"
      );
    }
  },
} as ICommand;
