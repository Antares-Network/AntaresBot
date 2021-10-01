import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import redditImageFetcher from 'reddit-image-fetcher';
import check from "../../functions/channelCheck"

export default {
    name: "reddit",
    category: 'user',
    description: 'Sends the ping time of the bot.',
    aliases: ['reddit', 'meme'],
    slash: false,
    testOnly: true,
    guildOnly: true,
    requiredPermissions: ['SEND_MESSAGES'],

    callback: async ({ client, channel, message }) => {
        if (await check.check(message, client)) {
            if (!channel.nsfw) {
                channel.send("In order to use this command, an admin must set this channel as type: `NSFW`")
                return
            }
            var img = await redditImageFetcher.fetch({
                type: 'meme',
                total: 1
            });
        
            const Embed = new MessageEmbed()
                .setColor('#ff3505')
                .setTitle(`Random Meme from Reddit`)
                .setImage(img[0].image)
                .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
            return(Embed);
        }
    }
} as ICommand

