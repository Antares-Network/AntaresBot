const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const channelCheck = require('../../functions/channelCheck')
const logToConsole = require('../../actions/logToConsole')

module.exports = class GithubCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'github',
            group: 'user',
            memberName: 'github',
            description: 'Sends an embed with a link to the github repo for the bot.',
            examples: ['github'],
            clientPermissions: ['MANAGE_MESSAGES'],
            guildOnly: true
        });
    }

    async run(message) {
        message.delete()
        if (await channelCheck.check(message) == true) {
            const githubEmbed = new MessageEmbed()
                .setColor('#ff3505')
                .setURL('https://dsc.gg/antaresnetwork')
                .setThumbnail('https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png')
                .setTitle('Github')
                .addField('Click here to go to the Antares Bot Github repo: \n https://github.com/Antares-Network/AntaresBot')
                .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png')
            message.channel.send(githubEmbed);
            logToConsole.command(message.guild, message);
        }
    }
};