const { Command } = require('discord.js-commando');
const logToConsole = require('../../actions/logToConsole');
const guildBan = require('../../actions/guildBan');


module.exports = class BotUnbanGuildCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'botunbanguild',
            group: 'owner',
            memberName: 'botunbanguild',
            description: 'Unban a guild from using the bot',
            examples: ['botunbanguild @nathen418#0002'],
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
        if (await guildBan.unBanGuild(guildID)) {
            //if the guild was unbanned respond with this
            message.author.send(`Unbanned ${guildID} from using this bot`);
        } else {
            //if the guild was already ubanned respond with this
            message.author.send("This guild has already been unbanned from using the bot")
        }
        try {
            logToConsole.command(message.guild, message);
        } catch (e) {
            logToConsole.dm(message);

        }
    }
}