const { Command } = require('discord.js-commando');
const guildBan = require('../../actions/guildBan');
const logToConsole = require('../../actions/logToConsole')


module.exports = class BotBanUserCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'botbanuser',
            group: 'owner',
            memberName: 'botbanuser',
            description: 'ban a user from using the bot',
            examples: ['botbanuser @nathen418#0002'],
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

    async run(message, { user }) {
        if (await guildBan.banUser(user)) {
            //if the user was banned respond with this
            message.channel.send(`Banned ${user.username} From ever using the bot again`);
        } else {
            //if the user was already banned respond with this
            message.channel.send("This user has already been baned from using the bot")
        }
        try {
            logToConsole.command(message.guild, message);
        } catch (e) {
            logToConsole.dm(message);

        }
    }
}