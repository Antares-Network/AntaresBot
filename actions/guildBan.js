//event to fire when a Guild is banned from inviting the bot
const gateModel = require('../models/gate');

module.exports = {
    banUser: async function (user) {
        const gate = await gateModel.findOne({ NAME: 'GATE' }); //find the entry for the guild
        var bannedUsers = gate.BANNED_USERS
        var inlist = false;
        for (var i = 0; i < bannedUsers.length; i++) {

            if (bannedUsers[i] === String(user.id)) {
                //if the user has already been banned from using the bot
                inlist = true;
            }

        }
        if (inlist) {
            return false;
        } else {
            bannedUsers.push(user.id)
            await gateModel.findOneAndUpdate({ NAME: 'GATE' }, { $set: { BANNED_USERS: bannedUsers } }, { new: true });
            console.log(bannedUsers)
            return true;
        }
    },
    unbanUser: async function (user) {
        const gate = await gateModel.findOne({ NAME: 'GATE' }); //find the entry for the guild
        var bannedUsers = gate.BANNED_USERS
        for (var i = 0; i < bannedUsers.length; i++) {

            if (bannedUsers[i] === user.id) {

                bannedUsers.splice(i, 1);
            }

        }
        await gateModel.findOneAndUpdate({ NAME: 'GATE' }, { $set: { BANNED_USERS: bannedUsers } }, { new: true });
    },
    banGuild: async function (message, guild) {
        const gate = await gateModel.findOne({ NAME: 'GATE' }); //find the entry for the guild
        var bannedGuilds = gate.BANNED_GUILDS
        var inlist = false;
        for (var i = 0; i < bannedguilds.length; i++) {

            if (bannedGuilds[i] === String(guild.id)) {
                //if the user has already been banned from using the bot
                inlist = true;
            }

        }
        if (inlist) {
            return false;
        } else {
            bannedGuilds.push(user.id)
            await gateModel.findOneAndUpdate({ NAME: 'GATE' }, { $set: { BANNED_GUILDS: bannedGuilds } }, { new: true });
            console.log(bannedGuilds)
            return true;
        }
    },
    unbanGuild: async function () {
        const gate = await gateModel.findOne({ NAME: 'GATE' }); //find the entry for the guild
        var bannedGuilds = gate.BANNED_USERS
        for (var i = 0; i < bannedGuilds.length; i++) {

            if (bannedGuilds[i] === guild.id) {

                bannedGuilds.splice(i, 1);
            }

        }
        await gateModel.findOneAndUpdate({ NAME: 'GATE' }, { $set: { BANNED_GUILDS: bannedGuilds } }, { new: true });
    }
}