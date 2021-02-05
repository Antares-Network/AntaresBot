const gateModel = require('../models/gate');
const guildModel = require('../models/guild');


module.exports = {
    event: async function (bot) {
        var totalUsers = 0;
        var totalMessages = 0;
        var totalOwners = [];
        bot.guilds.cache.forEach(async guild => {
            const doc = await guildModel.findOne({ GUILD_ID: guild.id }); //find the entry for the guild
            totalMessages += Number(doc.GUILD_MESSAGES);
            totalOwners.push(guild.ownerID);
            totalUsers += guild.memberCount
        });

        setTimeout(async () => {
            const gate = new gateModel({
                NAME: 'GATE',
                GUILD_OWNER_ID: totalOwners,
                BANNED_USERS: [],
                BANNED_GUILDS: [],
                TOTAL_MESSAGES: totalMessages,
                TOTAL_SERVERS: bot.guilds.cache.size,
                TOTAL_USERS: totalUsers
            });
            await gate.save();

        }, 5000);
    }
}