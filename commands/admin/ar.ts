import { MessageEmbed, TextChannel } from 'discord.js';
import { ICommand } from "wokcommands";
import { statcord } from "../../index";

export default {
  name: "ar",
  category: "admin",
  description: "Does nothing",
  slash: true,
  guildOnly: true,
  requiredPermissions: ["MANAGE_MESSAGES"],

  callback: async ({interaction}) => {
    // Command information
    const id = interaction.user.id;

    // Embed values
    const color = "#ff3505";
    const description = "[r](https://playantares.com/snips)";

    // Embed construction
    const Embed = new MessageEmbed()
      .setColor(color)
      .setDescription(description);

    //post command usage
    statcord.postCommand("r", id);

    //return the embed after the channel is checked
    return Embed;
  }
} as ICommand;
