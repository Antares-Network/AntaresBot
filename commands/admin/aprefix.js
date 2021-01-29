const { Command } = require('discord.js-commando');

module.exports = class SayCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'aprefix',
            group: 'admin',
            memberName: 'aprefix',
            description: 'changes the bot prefix for the guild',
            examples: ['prefix *'],
            args: [
                {
                    key: 'text',
                    prompt: 'Please enter the new prefix',
                    type: 'string',
                    default: ''
                }
            ]
        });
    }

    run(message, { text }) {
        message.channel.send("This command is not enabled yet.")
    }
};