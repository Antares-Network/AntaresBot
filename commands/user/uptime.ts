import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";

export default {
  name: "uptime",
  category: "user",
  description: "Sends an embed with a link to the github repo for the bot.",
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, message }) => {
    if (await check.check(message, client)) {
      let time = client.uptime!;
      let days = Math.floor(time / 86400000);
      let hours = Math.floor(time / 3600000) % 24;
      let minutes = Math.floor(time / 60000) % 60;
      let seconds = Math.floor(time / 1000) % 60;
      const Embed = new MessageEmbed()
        .setColor("#ff3505")
        .setTitle("Bot Uptime")
        .setDescription(
          `I have been online for ${days}d ${hours}h ${minutes}m ${seconds}s`
        )
        .setFooter(
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );
      return Embed;
    }
  },
} as ICommand;
