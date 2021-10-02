import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";

export default {
  name: "sneeze",
  category: "user",
  description: "Makes the bot sneeze",
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, channel, message }) => {
    if (await check.check(message, client)) {
      const sneezes = [
        "***Achoo!***",
        "*chew!*",
        "Ah... Ah... **A_CHOO!_**",
        "_Ah..._***CHOOOOOOOOOOOOOOOOOOOO!***",
        "*Achoo!* Excuse me!",
        "",
      ];
      channel.send(
        sneezes[Math.floor(Math.random() * Math.floor(sneezes.length))]
      );
    }
  },
} as ICommand;
