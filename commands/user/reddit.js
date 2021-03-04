const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const redditImageFetcher = require('reddit-image-fetcher');
const channelCheck = require('../../functions/channelCheck')
const logToConsole = require('../../actions/logToConsole')


module.exports = class RedditCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'reddit',
            aliases: ['meme'],
            group: 'user',
            memberName: 'reddit',
            description: 'Sends a random meme from reddit',
            examples: ['reddit'],
            clientPermissions: ['MANAGE_MESSAGES'],
            guildOnly: true
        });
    }
    async run(message) {
        message.delete()
        if (await channelCheck.check(message) == true) {
            message.channel.send("This command is disabled as it is being rewritten to improve NSFW filtering")
            // var img = await redditImageFetcher.fetch({
            //     type: 'meme',
            //     NSFW: false,
            //     total: 1
            // });

            // // if (post.NSFW = true) {
            // //     message.channel.send("Something went wrong with our connection to reddit. Please try again.")
            // //     return;
            // // }
            // const Embed = new MessageEmbed()
            //     .setColor('#ff3505')
            //     .setURL('https://dsc.gg/antaresnetwork')
            //     .setTitle(`Random Meme from Reddit`)
            //     .setImage(img[0].image)
            //     .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
            // message.channel.send(Embed);
            logToConsole.command(message.guild, message);
        }
    }
};