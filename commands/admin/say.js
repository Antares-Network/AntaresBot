const { Command } = require('discord.js-commando');
const logToConsole = require('../../actions/logToConsole')

module.exports = class SayCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'say',
            aliases: ['echo',],
            group: 'admin',
            memberName: 'say',
            description: 'Replies with the text you provide.',
            examples: ['say Hi there!'],
            args: [
                {
                    key: 'text',
                    prompt: 'What text would you like the bot to say?',
                    type: 'string'
                }
            ],
            guildOnly: true,
            userPermissions: ['ADMINISTRATOR']
        });
    }

    run(message, { text }) {
        message.delete();
        message.say(text);
        logToConsole.command(message.guild, message);
    }
};