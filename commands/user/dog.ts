import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import axios from "axios";
import check from "../../functions/channelCheck";
import { statcord } from "../../index"

export default {
  name: "dog",
  category: "user",
  description: "Sends a random dog image",
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
    const title = "Random Dog Picture"
    let url = await axios.get("https://dog.ceo/api/breeds/image/random").then(res => res.data.message);
    const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`
    const footerIcon = "https://playantares.com/resources/icon.png"

    // Embed construction
    const Embed = new MessageEmbed()
      .setColor(color)
      .setTitle(title)
      .setImage(url)
      .setFooter({text: footer, iconURL: footerIcon});

    //post command usage
    statcord.postCommand("dog", id);

    //return the embed after the channel is checked
    if (await check.check(interaction, chan)) return Embed;
  },
} as ICommand;