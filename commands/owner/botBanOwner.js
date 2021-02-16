const { Command } = require('discord.js-commando');
const guildBan = require('../../actions/guildBan');


module.exports = class BotBanOwnerCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'botbanowner',
            group: 'owner',
            memberName: 'botbanowner',
            description: 'Ban an owner from using the bot',
            examples: ['botbanowner 535497457749065738'],
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
        if (guildBan.banOwner(ownerID)) {
            //if the user was banned respond with this
            message.author.send(`Banned ${ownerID} from ever using this bot in a server they own again`);
        } else {
            //if the user was already banned respond with this
            message.author.send("This user has already been baned from having the bot in any server they own again")
        }
        try {
            logToConsole.command(message.guild, message);
        } catch (e) {
            logToConsole.dm(message);

        }
    }
}