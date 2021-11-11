import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import statcord from "../../index"

export default {
  name: "seasonbot",
  category: "user",
  description: "Sends an embed with a link to the most recent Season Bot season",
  aliases: ["santa", "chewie", "patrick", "halloween", "christmas", "easter", "summer", "winter", "spring", "fall"],
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, message }) => {
    const seasonBotAvatarUrl = "https://playantares.com/resources/santa-bot-2021.png"
    if (await check.check(message, client)) {
      statcord.statcord.postCommand("seasonbot", message.author.id);
      const Embed = new MessageEmbed()
        .setColor("#ff3505")
        .setURL("https://dsc.gg/seasonbot")
        .setThumbnail(String(seasonBotAvatarUrl))
        .setTitle("Invite Santa Bot today!")
        .setFields([
          { name: "Santa Bot", value: "Invite Santa Bot today."},
          { name: "About", value: "Santa Bot is a verified bot that will bring Christmas fun to your servers! More than 1200 servers love his games!"},
          { name: "Longer Description", value: "Santa will be your host for this season! MERRY CHRISTMAS! Get ready to pick up all of the presents that santa drops, but be careful about getting coal! The Bot is capable of running a game on your server to see who are the fastest ones getting the dropped presents. Donate to get premium, and have presents auto drop by chat activity. A portion of donations will go to the Make A Wish Foundation."},
          { name: "Invite Santa Bot", value: "https://dsc.gg/seasonbot"}
        ])
        .setFooter(
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );
      return Embed;
    }
  },
} as ICommand;
