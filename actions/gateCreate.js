const gateModel = require('../models/gate');
const guildModel = require('../models/guild');


module.exports = {
    event: async function (bot) {

        //var init and gc
        var totalUsers = 0;
        var totalMessages = 0;
        var totalOwners = [];

        //loop thru the guilds and add the owners, member numbers and messages to their vars to be added to the db 
        bot.guilds.cache.forEach(async guild => {
            const doc = await guildModel.findOne({ GUILD_ID: guild.id }); //find the doc that has all the guild information in it
            totalMessages += Number(doc.GUILD_MESSAGES);
            totalOwners.push(guild.ownerID);
            totalUsers += guild.memberCount
        });

        //make it pause 5 seconds before saving to the database because then the stuff above has time to finish processing
        setTimeout(async () => {
            const gate = new gateModel({
                NAME: 'GATE',
                GUILD_OWNER_ID: totalOwners,
                BANNED_OWNERS: [],
                BANNED_USERS: [],
                BANNED_GUILDS: [],
                TOTAL_MESSAGES: totalMessages,
                TOTAL_SERVERS: bot.guilds.cache.size,
                TOTAL_USERS: totalUsers
            });
            //upload db file to the db remote server
            await gate.save();

        }, 5000);
    }
}