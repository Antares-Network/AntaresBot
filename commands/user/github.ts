import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import { statcord } from "../../index"

export default {
  name: "github",
  category: "user",
  description: "Sends an embed with a link to the github repo for the bot.",
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
    const url = "https://dsc.gg/antaresnetwork"
    const thumbnail = "https://playantares.com/resources/icon.png"
    const title = "Github"
    const description = "Click here to go to the Antares Bot Github repo: \n https://github.com/Antares-Network/AntaresBot"
    const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`
    const footerIcon = "https://playantares.com/resources/icon.png"

    // Embed construction
    const Embed = new MessageEmbed()
      .setColor(color)
      .setURL(url)
      .setTitle(title)
      .setThumbnail(thumbnail)
      .setDescription(description)
      .setFooter(footer, footerIcon);
    
    // Post command usage
    statcord.postCommand("github", id);

    // Return the embed after the channel is checked
    if (await check.check(interaction, chan)) return Embed;
  },
} as ICommand;