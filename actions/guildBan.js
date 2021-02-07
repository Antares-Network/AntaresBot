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
        //if the user is in the list of banned users, return false
        if (inlist) {
            return false;
        } else { //if they are not already in  the banned users list, add them now
            bannedUsers.push(user.id)
            await gateModel.findOneAndUpdate({ NAME: 'GATE' }, { $set: { BANNED_USERS: bannedUsers } }, { new: true });
            return true;
        }
    },
    unBanUser: async function (user) {
        const gate = await gateModel.findOne({ NAME: 'GATE' }); //find the entry for the guild
        var bannedUsers = gate.BANNED_USERS
        for (var i = 0; i < bannedUsers.length; i++) {
            if (bannedUsers[i] === user.id) {

                bannedUsers.splice(i, 1);
            }
        }
        await gateModel.findOneAndUpdate({ NAME: 'GATE' }, { $set: { BANNED_USERS: bannedUsers } }, { new: true });
    },
    banGuild: async function (guildID) {
        const gate = await gateModel.findOne({ NAME: 'GATE' }); //find the entry for the guild
        var bannedGuilds = gate.BANNED_GUILDS
        var inlist = false;
        for (var i = 0; i < bannedGuilds.length; i++) {
            if (bannedGuilds[i] === guildID) {
                //if the user has already been banned from using the bot
                inlist = true;
            }
        }
        if (inlist) {
            return false;
        } else {
            bannedGuilds.push(guildID)
            await gateModel.findOneAndUpdate({ NAME: 'GATE' }, { $set: { BANNED_GUILDS: bannedGuilds } }, { new: true });
            return true;
        }
    },
    unBanGuild: async function (guildID) {
        const gate = await gateModel.findOne({ NAME: 'GATE' }); //find the entry for the guild
        var bannedGuilds = gate.BANNED_USERS
        for (var i = 0; i < bannedGuilds.length; i++) {
            if (bannedGuilds[i] === guildID) {

                bannedGuilds.splice(i, 1);
            }
        }
        await gateModel.findOneAndUpdate({ NAME: 'GATE' }, { $set: { BANNED_GUILDS: bannedGuilds } }, { new: true });
    },
    banOwner: async function (ownerID) {
        const gate = await gateModel.findOne({ NAME: 'GATE' }); //find the entry for the guild
        var bannedOwners = gate.BANNED_OWNERS
        var inlist = false;
        for (var i = 0; i < bannedOwners.length; i++) {
            if (bannedOwners[i] === ownerID) {
                //if the user has already been banned from using the bot
                inlist = true;
            }
        }
        if (inlist) {
            return false;
        } else {
            bannedOwners.push(ownerID)
            await gateModel.findOneAndUpdate({ NAME: 'GATE' }, { $set: { BANNED_OWNERS: bannedOwners } }, { new: true });
            return true;
        }
    },
    unBanOwner: async function (ownerID) {
        const gate = await gateModel.findOne({ NAME: 'GATE' }); //find the entry for the guild
        var bannedOwners = gate.BANNED_OWNERS
        for (var i = 0; i < bannedOwners.length; i++) {
            if (bannedOwners[i] === ownerID) {

                bannedOwners.splice(i, 1);
            }
        }
        await gateModel.findOneAndUpdate({ NAME: 'GATE' }, { $set: { BANNED_GUILDS: bannedOwners } }, { new: true });
    }
}