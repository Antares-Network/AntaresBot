import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import axios from "axios";
import check from "../../functions/channelCheck";
import { statcord } from "../../index"

export default {
  name: "fox",
  category: "user",
  description: "Sends a random fox image",
  slash: true,
  testOnly: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
    // Command Information
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;

    // Embed values
    const color = "#ff3505"
    const title = "Random Fox Picture"
    const url = await axios.get("https://randomfox.ca/floof/").then(res => res.data.image);
    const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`
    const footerIcon = "https://antaresnetwork.com/resources/icon.png"

    // Embed construction
    const Embed = new MessageEmbed()
      .setColor(color)
      .setTitle(title)
      .setImage(url)
      .setFooter({text: footer, iconURL: footerIcon});
    
    // Post command usage
    statcord.postCommand("fox", id);

    // Return the embed after the channel is checked
    if (await check.check(interaction, chan)) return Embed;
  },
} as ICommand;