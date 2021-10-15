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

  callback: async ({ client, message, channel }) => {
    if (await check.check(message, client)) {
      if (channel.nsfw === true) {
        let img = await redditImageFetcher.fetch({
          type: "custom",
          total: 1,
          subreddit: ["wholesomememes", "memes"],
        });
         while (img[0].nsfw === true) {
          img = await redditImageFetcher.fetch({
            type: "custom",
            total: 1,
            subreddit: ["wholesomememes", "memes", "oddlysatisfying"],
          });
        }
        console.log("is nsfw:" + img[0].NSFW);
  
        const Embed = new MessageEmbed()
          .setColor("#ff3505")
          .setTitle(`Random Meme from Reddit`)
          .setImage(img[0].image)
          .setFooter(
            `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
            "https://playantares.com/resources/icon.png"
          );
        return Embed;
      } else {
        return message.reply("This channel is not marked as **NSFW**.\nAs we can not guarantee 100% any memes delivered will be SFW, this command must be used in a channel marked **NSFW**");
      }
    }
  },
} as ICommand;
