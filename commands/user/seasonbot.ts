import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";

export default {
  name: "seasonbot",
  category: "user",
  description: "Sends an embed with a link to the most recent Season Bot season",
  aliases: ["santa", "chewie", "patrick", "halloween", "christmas", "easter", "summer", "winter", "spring", "fall"],
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, message }) => {
    const seasonBotAvatarUrl = "https://cdn.discordapp.com/avatars/774520746344054824/ab7ad167790a14d3acb76472e1becaa1.png"
    console.log(seasonBotAvatarUrl);
    if (await check.check(message, client)) {
      const Embed = new MessageEmbed()
        .setColor("#ff3505")
        .setURL("https://dsc.gg/seasonbot")
        .setThumbnail(String(seasonBotAvatarUrl))
        .setTitle("Invite Season Bot today!")
        .setFields([
          { name: "Season Bot", value: "Invite Season Bot today."},
          { name: "About", value: "Boo Bot (aka Santa Bot) it’s a bot that will bring Halloween fun to your servers! More than 500 servers love the seasonal themes!"},
          { name: "Longer Description", value: "Boo will be your host for this season! Trick or Treat? Get ready to get all the candy from our spooky gang, but be careful about the poisoned ones! The Bot is capable of running a game on your server to see who are the fastest ones getting candy that randomly appears."},
          { name: "Invite Season Bot", value: "https://dsc.gg/seasonbot"}
        ])
        .setFooter(
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );
      return Embed;
    }
  },
} as ICommand;
