const { Command } = require('discord.js-commando');

module.exports = class VersionCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'version',
            aliases: ['vs', 'v', 'ver'],
            group: 'user',
            memberName: 'version',
            description: 'Sends the version number of the bot',
            examples: ['version'],
            guildOnly: true
        });
    }

    run(message) {
        message.delete();
        message.channel.send(`I am running Version: ${botVersion}`)
        //logToConsole.command(message.guild, message);
    }
};