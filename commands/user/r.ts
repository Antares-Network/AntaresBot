import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import { statcord } from "../../index";

export default {
  name: "r",
  category: "user",
  description: "Does something. You'll find out.",
  slash: true,
  guildOnly: true,
  testOnly: false,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({interaction }) => {
    // Command information
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;

    // Embed values
    const color = "#ff3505";
    const description = "[r](https://antaresnetwork.com/snips)";

    // Embed construction
    const Embed = new MessageEmbed()
      .setColor(color)
      .setDescription(description);

    //post command usage
    statcord.postCommand("r", id);

    //return the embed after the channel is checked
    if (await check.check(interaction, chan)) return Embed;
  },
} as ICommand;