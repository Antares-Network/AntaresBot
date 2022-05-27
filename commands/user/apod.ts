import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import axios from "axios";
import check from "../../functions/channelCheck";
import { statcord } from "../../index"

export default {
  name: "apod",
  category: "user",
  description: "Gets data from the APOD NASA API",
  slash: true,
  testOnly: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ interaction }) => {
    // Command information
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;


    // Get the APOD data
    const { data } = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_API_KEY}`);
    
    // Embed values
    const color = "#ff3505"
    const title = data.title;
    const image = data.url;
    const description = data.explanation;
    const footer = `${data.date} | Author ${data.copyright}`
    const footerIcon = "https://playantares.com/resources/icon.png"

    // Embed construction
    const Embed = new MessageEmbed()
      .setColor(color)
      .setTitle(title)
      .setImage(image)
      .setDescription(description)
      .setFooter({text: footer, iconURL: footerIcon});
    
    // Post command usage
    statcord.postCommand("APOD", id);

    // Return the embed after the channel is checked
    if (await check.check(interaction, chan)) return Embed;
  },
} as ICommand;