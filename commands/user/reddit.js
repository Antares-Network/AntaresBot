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
            //clientPermissions: ['MANAGE_MESSAGES'],
            guildOnly: true
        });
    }
    async run(message) {
        //message.delete()
        if (await channelCheck.check(message) == true) {
            if (!message.channel.nsfw) {
                message.channel.send("In order to use this command, an admin must set this channel as type: `NSFW`")
                return
            }
            var img = await redditImageFetcher.fetch({
                type: 'meme',
                NSFW: false,
                total: 1
            });

            const Embed = new MessageEmbed()
                .setColor(config.defaultEmbedColor)
                //.setURL('https://dsc.gg/antaresnetwork')
                .setTitle(`Random Meme from Reddit`)
                .setImage(img[0].image)
                .setFooter(`Delivered in: ${this.client.ws.ping}ms | Antares Bot | ${botVersion}`, config.embedFooterIcon);
            message.channel.send(Embed);
            logToConsole.command(message.guild, message);
        }
    }
};
