import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import statcord from "../../index"

export default {
  name: "diceroll",
  category: "user",
  description: "Rolls a die",
  aliases: ["dice", "roll", "rolldice"],
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, message }) => {
    if (await check.check(message, client)) {
      statcord.statcord.postCommand("diceroll", message.author.id);
      const outcome = Math.ceil(Math.random() * 6);
      const preEmbed = new MessageEmbed()
        .setColor("#ff3505")
        .setTitle("Dice Roll 🎲")
        .setDescription(
          `${message.author.username} rolled a die. What side will it land on?\n Rolling...`
        )
        .setFooter(
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );
      const postEmbed = new MessageEmbed()
        .setColor("#ff3505")
        .setTitle("Dice Roll 🎲")
        .setThumbnail(
          `https://playantares.com/resources/diceroll.gif`
        )
        .setDescription(`${message.author.username} rolled a ${outcome}!`)
        .setFooter(
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );
      const MSG = await message.reply({ embeds: [preEmbed] });
      setTimeout(() => {
        MSG.edit({ embeds: [postEmbed] });
      }, 3000);
    }
  },
} as ICommand;
