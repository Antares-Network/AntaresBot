import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import { statcord } from "../../index"

export default {
  name: "status",
  category: "user",
  description: "Sends an embed with a link to the status page for the entire Antares Network.",
  slash: true,
  testOnly: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
    // Command information
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;
    
    // Embed values
    const color = "#ff3505"
    const url = "https://status.playantares.com"
    const thumbnail = "https://playantares.com/resources/icon.png"
    const title = "Status Page"
    const description = "Click here to go to the Antares Network Status page: \n https://status.playantares.com"
    const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`
    const footerIcon = "https://playantares.com/resources/icon.png"

    // Embed construction
    const Embed = new MessageEmbed()
      .setColor(color)
      .setURL(url)
      .setTitle(title)
      .setThumbnail(thumbnail)
      .setDescription(description)
      .setFooter({text: footer, iconURL: footerIcon});
    
    // Post command usage
    statcord.postCommand("status", id);

    // Return the embed after the channel is checked
    if (await check.check(interaction, chan)) return Embed;
  },
} as ICommand;