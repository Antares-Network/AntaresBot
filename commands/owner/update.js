//updates the main GATE model to contain the most up to date server information

const { Command } = require('discord.js-commando');
const gateModel = require('../../models/gate');
const guildModel = require('../../models/guild');
const logToConsole = require('../../actions/logToConsole');



module.exports = class UpdateCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'update',
            group: 'owner',
            memberName: 'update',
            description: 'Update all the databases',
            examples: ['update'],
            guildOnly: true
        });
    }

    //check to make sure the bot owner is the one running the show
    hasPermission(msg) {
        return this.client.isOwner(msg.author);
    }


    async run(message) {
        //var init and gc
        var totalUsers = 0;
        var totalMessages = 0;
        var totalOwners = [];

        //get data from all the guilds
        bot.guilds.cache.forEach(async guild => {
            const doc = await guildModel.findOne({ GUILD_ID: guild.id }); //find the doc that has all the guild information in it
            totalMessages += Number(doc.GUILD_MESSAGES);
            totalOwners.push(guild.ownerID);
            totalUsers += guild.memberCount
        });

        setTimeout(async () => {
            await gateModel.findOneAndUpdate({ NAME: 'GATE' }, {
                $set: {
                    GUILD_OWNER_ID: totalOwners,
                    TOTAL_MESSAGES: totalMessages,
                    TOTAL_SERVERS: bot.guilds.cache.size,
                    TOTAL_USERS: totalUsers
                }
            }, { new: true });
        }, 5000);


        try {
            logToConsole.command(message.guild, message);
        } catch (e) {
            logToConsole.dm(message);

        }
    }
}