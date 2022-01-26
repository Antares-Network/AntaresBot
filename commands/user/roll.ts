import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import { statcord } from "../../index";

export default {
  name: "roll",
  category: "user",
  description: "Rolls a die",
  slash: true,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;
    const author = interaction.user;

    const outcome = Math.ceil(Math.random() * 6);
    const preEmbed = new MessageEmbed()
      .setColor("#ff3505")
      .setTitle("Dice Roll 🎲")
      .setDescription(
        `${author.username} rolled a die. What side will it land on?\n Rolling...`
      )
      .setFooter({text:
      `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
      "https://playantares.com/resources/icon.png"
    });
    const postEmbed = new MessageEmbed()
      .setColor("#ff3505")
      .setTitle("Dice Roll 🎲")
      .setThumbnail(`https://playantares.com/resources/diceroll.gif`)
      .setDescription(`${author.username} rolled a ${outcome}!`)
      .setFooter({text:
      `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
      "https://playantares.com/resources/icon.png"
    });
    if (await check.check(interaction, chan)) {
      interaction.reply({ embeds: [preEmbed] });
      setTimeout(() => {
        interaction.editReply({ embeds: [postEmbed] });
      }, 3000);
      statcord.postCommand("roll", id);
    }
  },
} as ICommand;
