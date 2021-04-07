const { Command } = require('discord.js-commando');
const logToConsole = require('../../actions/logToConsole');
const guildBan = require('../../actions/guildBan');


module.exports = class BotBanGuildCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'botbanguild',
            group: 'owner',
            memberName: 'botbanguild',
            description: 'Ban a guild from using the bot',
            examples: ['botbanuser @nathen418#0002'],
            args: [
                {
                    key: 'guildID',
                    prompt: 'Please mention a guildID',
                    type: 'string'
                }
            ]
        });
    }

    //check to make sure the bot owner is the one running the show
    hasPermission(msg) {
        return this.client.isOwner(msg.author);
    }

    async run(message, { guildID }) {
        if (await guildBan.banGuild(guildID)) {
            //if the user was banned respond with this
            message.author.send(`Banned ${guildID} From ever using the bot again`);
        } else {
            //if the user was already banned respond with this
            message.author.send("This user has already been baned from using the bot")
        }
        logToConsole.ban(message);
    }
}