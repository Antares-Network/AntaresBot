import { TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import { statcord } from "../../index";

export default {
  name: "sneeze",
  category: "user",
  description: "Makes the bot sneeze",
  slash: true,
  guildOnly: true,
  testOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
    // Command information
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;
    const author = interaction.user;

    // Computed values
    const sneezes = [
      "***Achoo!***",
      "*chew!*",
      "Ah... Ah... **A_CHOO!_**",
      "_Ah..._***CHOOOOOOOOOOOOOOOOOOOO!***",
      "*Achoo!* Excuse me!",
      "",
    ];

    // Response values
    const response =
      sneezes[Math.floor(Math.random() * Math.floor(sneezes.length))];

    //post command usage
    statcord.postCommand("sneeze", id);

    //return the embed after the channel is checked
    if (await check.check(interaction, chan, author, client)) return response;
  },
} as ICommand;