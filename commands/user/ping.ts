import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import { statcord } from "../../index"
import check from "../../functions/channelCheck";

export default {
  name: "ping",
  category: "user",
  description: "Sends the ping time of the bot.",
  slash: true,
  testOnly: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;
    const Embed = new MessageEmbed()
        .setColor("#ff3505")
        .setTitle("Bot/API Ping")
        .setDescription(`Ping: 🏓 | Latency is: **${client.ws.ping}**ms.`)
        .setFooter({text:
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
          "https://antaresnetwork.com/resources/icon.png"
        });

    // Post command usage
    statcord.postCommand("ping", id);

    // Return the embed after the channel is checked
    if (await check.check(interaction, chan)) return Embed
  },
} as ICommand;
