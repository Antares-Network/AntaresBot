import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import axios from "axios";
import check from "../../functions/channelCheck";
import { statcord } from "../../index"

export default {
  name: "duck",
  category: "user",
  description: "Sends a random duck image",
  slash: true,
  testOnly: true,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
    // Command information
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;

    // Embed values
    const color = "#ff3505"
    const title = "Random Duck Picture"
    let url = await axios.get("https://random-d.uk/api/v2/random").then(res => res.data.url);
    const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`
    const footerIcon = "https://playantares.com/resources/icon.png"

    // Embed construction
    const Embed = new MessageEmbed()
      .setColor(color)
      .setTitle(title)
      .setImage(url)
      .setFooter(footer, footerIcon);
    
    // Post command usage
    statcord.postCommand("duck", id);

    // Return the embed after the channel is checked
    if (await check.check(interaction, chan)) return Embed;
  },
} as ICommand;