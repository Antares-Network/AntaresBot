import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import statcord from "../../index"

export default {
  name: "version",
  category: "user",
  description: "Sends the version number of the bot",
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, message }) => {
    if (await check.check(message, client)) {
      statcord.statcord.postCommand("version", message.author.id);
      const Embed = new MessageEmbed()
        .setColor("#ff3505")
        .setTitle("Version:")
        .setDescription(`I am running version: ${process.env.VERSION}`)
        .setFooter(
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );
      return Embed;
    }
  },
} as ICommand;
