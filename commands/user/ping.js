const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const channelCheck = require('../../functions/channelCheck')
const logToConsole = require('../../actions/logToConsole')

module.exports = class PingCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'ping',
            aliases: ['latency'],
            group: 'user',
            memberName: 'ping',
            description: 'Sends the ping time of the bot.',
            examples: ['ping'],
            clientPermissions: ['MANAGE_MESSAGES'],
            guildOnly: true
        });
    }
    async run(message) {
        message.delete()
        if (await channelCheck.check(message) == true) {
            const pingEmbed = new MessageEmbed()
                .setColor('#ff3505')
                .setTitle('Bot/API Ping')
                .setDescription(`Ping: 🏓 | Latency is: **${bot.ws.ping}**ms.`,);
            message.channel.send(pingEmbed);
            logToConsole.command(message.guild, message);
        }
    }
};