import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";

export default {
  name: "coinflip",
  category: "user",
  description: "Flips a coin",
  aliases: ["flip", "coin", "flipcoin", "headstails"],
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, message }) => {
    if (await check.check(message, client)) {
      let outcome = Math.round(Math.random()) == 0 ? "Tails" : "Heads";
      const preEmbed = new MessageEmbed()
        .setColor("#ff3505")
        .setTitle("Coin Flip 💰")
        .setDescription(
          `${message.author.username} flipped a coin. What side will it land on?\n Flipping...`
        )
        .setFooter(
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );
      const postEmbed = new MessageEmbed()
        .setColor("#ff3505")
        .setTitle("Coin Flip 💰")
        .setThumbnail(
          `https://playantares.com/resources/antaresbot/coinflip.gif`
        )
        .setDescription(`${message.author.username} got ${outcome}!`)
        .setFooter(
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );
      let MSG = await message.reply({ embeds: [preEmbed] });
      setTimeout( () => {
        MSG.edit({ embeds: [postEmbed] });
      }, 3000);
    }
  },
} as ICommand;
