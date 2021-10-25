import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import statcord from "../../index"

export default {
  name: "r",
  category: "user",
  description: "Does nothing",
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, message }) => {
    if (await check.check(message, client)) {
      statcord.statcord.postCommand("r", message.author.id);
      const Embed = new MessageEmbed()
            .setColor("#ff3505")
            .setDescription('[r](https://playantares.com/snips)')
      return Embed;
    }
  }
} as ICommand;
