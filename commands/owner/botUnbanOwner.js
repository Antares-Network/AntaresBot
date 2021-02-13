const { Command } = require('discord.js-commando');
const guildBan = require('../../actions/guildBan');


module.exports = class BotUnbanOwnerCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'botunbanowner',
            group: 'owner',
            memberName: 'botunbanowner',
            description: 'unban an owner from using the bot',
            examples: ['unbotbanowner 535497457749065738'],
            args: [
                {
                    key: 'ownerID',
                    prompt: 'Please mention a ownerID',
                    type: 'string'
                }
            ]
        });
    }

    //check to make sure the bot owner is the one running the show
    hasPermission(msg) {
        return this.client.isOwner(msg.author);
    }

    run(message, { ownerID }) {
        if (guildBan.unBanOwner(ownerID)) {
            //if the user was banned respond with this
            message.author.send(`Unbanned ${ownerID} from using this bot`);
        } else {
            //if the user was already banned respond with this
            message.author.send("This user has already been unbaned from using the bot")
        }
        try {
            logToConsole.command(message.guild, message);
        } catch (e) {
            logToConsole.dm(message);

        }
    }
}