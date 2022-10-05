import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import { statcord } from "../../index";
import check from "../../functions/channelCheck";

export default {
  name: "flip",
  category: "user",
  description: "Flips a coin",
  slash: true,
  testOnly: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;
    const author = interaction.user;

    const outcome = Math.round(Math.random()) == 0 ? "Tails" : "Heads";
    const preEmbed = new MessageEmbed()
      .setColor("#ff3505")
      .setTitle("Coin Flip 💰")
      .setDescription(
        `${author.username} flipped a coin. What side will it land on?\n Flipping...`
      )
      .setFooter({text:
        `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
        "https://antaresnetwork.com/resources/icon.png"
      });
    const postEmbed = new MessageEmbed()
      .setColor("#ff3505")
      .setTitle("Coin Flip 💰")
      .setThumbnail(`https://antaresnetwork.com/resources/coinflip.gif`)
      .setDescription(`${author.username} got ${outcome}!`)
      .setFooter({text:
        `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
        "https://antaresnetwork.com/resources/icon.png"
      });
    // Return the embed after the channel is checked
    if (await check.check(interaction, chan)) {
      interaction.reply({ embeds: [preEmbed] });
      setTimeout(() => {
        interaction.editReply({ embeds: [postEmbed] });
      }, 3000);

      statcord.postCommand("flip", id);
    }
  },
} as ICommand;
