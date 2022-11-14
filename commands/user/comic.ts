import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import axios from "axios";
import check from "../../functions/channelCheck";
import { statcord } from "../../index";

export default {
  name: "comic",
  category: "user",
  description: "Gets a comic from xkcd",
  slash: true,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
      // Command Information
      const id = interaction.user.id;
      const chan = interaction.channel as TextChannel;
      const comicNum = Math.floor(Math.random() * 2697);
  
      // Embed values
      const color = "#ff3505"
      const title = "Random XKCD Comic"
      const url = await axios.get(`http://xkcd.com/${comicNum}/info.0.json`).then(res => res.data.img);
      const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`
      const footerIcon = "https://antaresnetwork.com/resources/icon.png"
  
      // Embed construction
      const Embed = new MessageEmbed()
        .setColor(color)
        .setTitle(title)
        .setImage(url)
        .setFooter({text: footer, iconURL: footerIcon});
      
      // Post command usage
      statcord.postCommand("xkcd", id);
  
      // Return the embed after the channel is checked
      if (await check.check(interaction, chan)) return Embed;
  },
} as ICommand;
