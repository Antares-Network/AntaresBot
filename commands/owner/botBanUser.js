const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const logToConsole = require('../../actions/logToConsole');
const guildModel = require('../../models/guild');
const guildBan = require('../../actions/guildBan');
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
    hasPermission(msg) {
        msg.channel.send("Only the bot owner can use this command.")
        return this.client.isOwner(msg.author);
    }

    run(message, { user }) {
        
        if(guildBan.banUser(user)) {
            message.channel.send(`Banned ${user.username} From ever using the bot again`);
        } else {
            message.channel.send("This user has already been baned from using the bot")
        }
    }
}