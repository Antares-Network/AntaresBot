import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";
import statcord from "../../index"
import check from "../../functions/channelCheck";

export default {
  name: "ping",
  category: "user",
  description: "Sends the ping time of the bot.",
  slash: "false",
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, message, }) => {
    statcord.statcord.postCommand("ping", message.author.id);
    
    if (await check.check(message, client)) {
      const Embed = new MessageEmbed()
        .setColor("#ff3505")
        .setTitle("Bot/API Ping")
        .setDescription(`Ping: 🏓 | Latency is: **${client.ws.ping}**ms.`)
        .setFooter(
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );
      return Embed;
    }
  },
} as ICommand;
