import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";
import redditImageFetcher from "reddit-image-fetcher";
import check from "../../functions/channelCheck";

export default {
  name: "reddit",
  category: "user",
  description: "Sends a random meme pulled from reddit",
  aliases: ["meme"],
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, message }) => {
    if (await check.check(message, client)) {
      const img = await redditImageFetcher.fetch({
        type: "meme",
        total: 1,
      });

      const Embed = new MessageEmbed()
        .setColor("#ff3505")
        .setTitle(`Random Meme from Reddit`)
        .setImage(img[0].image)
        .setFooter(
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );
      return Embed;
    }
  },
} as ICommand;
