import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import { statcord } from "../../index"
import axios from "axios";

export default {
  name: "cat",
  category: "user",
  description: "Sends a random cat image",
  slash: true,
  guildOnly: true,
  testOnly: false,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
    // Command information
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;

    // Embed values
    const color = "#ff3505"
    const title = "Random Cat Picture"
    const url = await axios.get("https://aws.random.cat/meow").then(res => res.data.file);
    const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`
    const footerIcon = "https://antaresnetwork.com/resources/icon.png"

    // Embed construction
    const Embed = new MessageEmbed()
      .setColor(color)
      .setTitle(title)
      .setImage(url)
      .setFooter({text: footer, iconURL: footerIcon});
    
    //post command usage
    statcord.postCommand("cat", id);

    // Return the embed after the channel is checked
    if (await check.check(interaction, chan)) return Embed;
  },
} as ICommand;