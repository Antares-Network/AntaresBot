import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import axios from "axios";
import check from "../../functions/channelCheck";
import { statcord } from "../../index";

export default {
  name: "xkcd",
  category: "user",
  description: "Gets a comic from xkcd",
  aliases: ["comic"],
  slash: true,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
      // Command Information
      const id = interaction.user.id;
      const chan = interaction.channel as TextChannel;
      const author = interaction.user;
      const comicNum = Math.floor(Math.random() * 2520);
  
      // Embed values
      const color = "#ff3505"
      const title = "Random XKCD Comic"
      let url = await axios.get(`http://xkcd.com/${comicNum}/info.0.json`).then(res => res.data.img);
      const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`
      const footerIcon = "https://playantares.com/resources/icon.png"
  
      // Embed construction
      const Embed = new MessageEmbed()
        .setColor(color)
        .setTitle(title)
        .setImage(url)
        .setFooter(footer, footerIcon);
      
      // Post command usage
      statcord.postCommand("xkcd", id);
  
      // Return the embed after the channel is checked
      if (await check.check(interaction, chan)) return Embed;
  },
} as ICommand;