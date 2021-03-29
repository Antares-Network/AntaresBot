const { Command } = require('discord.js-commando');
const channelCheck = require('../../functions/channelCheck')
const logToConsole = require('../../actions/logToConsole')

module.exports = class SneezeCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'sneeze',
            aliases: ['achoo'],
            group: 'user',
            memberName: 'sneeze',
            description: 'Makes the bot sneeze.',
            examples: ['sneeze'],
            //clientPermissions: ['MANAGE_MESSAGES'],
            guildOnly: true
        });
    }
    async run(message) {
        //message.delete()
        if (await channelCheck.check(message) == true) {
            const sneezes = [
                "***Achoo!***",
                "*chew!*",
                "Ah... Ah... **A_CHOO!_**",
                "_Ah..._***CHOOOOOOOOOOOOOOOOOOOO!***",
                "*Achoo!* Excuse me!"
            ];
            message.channel.send(
                sneezes[Math.floor(Math.random() * Math.floor(sneezes.length))]
            );
            logToConsole.command(message.guild, message);
        }
    }
};