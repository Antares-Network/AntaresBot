const { Command } = require('discord.js-commando');
const logToConsole = require('../../actions/logToConsole')
const channelCheck = require('../../functions/channelCheck')

module.exports = class VersionCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'version',
            aliases: ['vs', 'v', 'ver'],
            group: 'user',
            memberName: 'version',
            description: 'Sends the version number of the bot',
            examples: ['version'],
            clientPermissions: ['MANAGE_MESSAGES'],
            guildOnly: true
        });
    }

    async run(message) {
        message.delete();
        if (await channelCheck.check(message) == true) {
            message.channel.send(`I am running Version: ${botVersion}`)
            logToConsole.command(message.guild, message);
        }
    }
};