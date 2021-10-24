import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";

export default {
  name: "ar",
  category: "admin",
  description: "Does nothing",
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ message, client }) => {
    const Embed = new MessageEmbed()
            .setColor("#ff3505")
            .setDescription('[r](https://playantares.com/snips)')
    return Embed;
  }
} as ICommand;
