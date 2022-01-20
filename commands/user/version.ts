import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import { statcord } from "../../index"

export default {
  name: "version",
  category: "user",
  description: "Sends the version number of the bot",
  slash: true,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
        // Command Information
        const id = interaction.user.id;
        const chan = interaction.channel as TextChannel;
    
        // Embed values
        const color = "#ff3505"
        const title = "Version:"
        const description = `I am running version: ${process.env.VERSION}`
        const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`
        const footerIcon = "https://playantares.com/resources/icon.png"
    
        // Embed construction
        const Embed = new MessageEmbed()
          .setColor(color)
          .setTitle(title)
          .setDescription(description)
          .setFooter({text: footer, iconURL: footerIcon});
        
        // Post command usage
        statcord.postCommand("version", id);
    
        // Return the embed after the channel is checked
        if (await check.check(interaction, chan)) return Embed;
  },
} as ICommand;