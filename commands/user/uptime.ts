import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import { statcord } from "../../index"

export default {
  name: "uptime",
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
    const author = interaction.user;

    // Computed values
    const time = client.uptime!;
    const days = Math.floor(time / 86400000);
    const hours = Math.floor(time / 3600000) % 24;
    const minutes = Math.floor(time / 60000) % 60;
    const seconds = Math.floor(time / 1000) % 60;

    // Embed values
    const color = "#ff3505"
    const title = "Bot Uptime"
    const description = `I have been online for ${days}d ${hours}h ${minutes}m ${seconds}s`
    const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`
    const footerIcon = "https://playantares.com/resources/icon.png"
      
    // Embed construction
    const Embed = new MessageEmbed()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFooter(footer, footerIcon);
    
    // Post command usage
    statcord.postCommand("uptime", id);

    // Return the embed after the channel is checked
    if (await check.check(interaction, chan, author, client)) return Embed;
  },
} as ICommand;