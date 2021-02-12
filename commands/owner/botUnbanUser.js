const { Command } = require('discord.js-commando');
const guildBan = require('../../actions/guildBan');
const logToConsole = require('../../actions/logToConsole')


module.exports = class BotUnbanUserCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'botunbanuser',
            group: 'owner',
            memberName: 'botunbanuser',
            description: 'unban a user from using the bot',
            examples: ['botunbanuser @nathen418#0002'],
            args: [
                {
                    key: 'user',
                    prompt: 'Please mention a user',
                    type: 'user'
                }
            ],
            guildOnly: true
        });
    }

    //check to make sure the bot owner is the one running the show
    hasPermission(msg) {
        return this.client.isOwner(msg.author);
    }

    run(message, { user }) {
        if (guildBan.unBanUser(user)) {
            //if the user was banned respond with this
            message.channel.send(`Unbanned ${user.username} from using this bot`);
        } else {
            //if the user was already banned respond with this
            message.channel.send("This user has already been unbaned from using the bot")
        }
        try {
            logToConsole.command(message.guild, message);
        } catch (e) {
            logToConsole.dm(message);

        }
    }
}