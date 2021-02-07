const gateModel = require('../models/gate');
const logToConsole = require('../../actions/logToConsole')

module.exports = {
    moderate: async function (target, ID, type) {
        const gate = await gateModel.findOne({ NAME: 'GATE' }); //find the entry for the guild
        var inlist = false;
        var list;

        switch (target) {
            case 'user':
                list = gate.BANNED_USERS
                break;
            case 'owner':
                list = gate.BANNED_OWNERS
                break;
            case 'guild':
                list = gate.BANNED_GUILDS
                break;
        }
        if (type == 'ban') {
            for (var i = 0; i < list.length; i++) {
                if (list[i] === String(ID)) {
                    //if the user has already been banned from using the bot, return true
                    inlist = true;
                }
            }
        } else if (type == 'unban') {
            for (var i = 0; i < list.length; i++) {
                if (list[i] === String(ID)) {
                    //if the user has already been banned from using the bot, return true
                    list.splice(i, 1);
                }
            }
        }
        //if the user is in the list of banned users, return false
        if (inlist) {
            return false; //! this will cause problems down the road!!!!!!!!
        } else { //if they are not already in  the banned users list, add them now
            list.push(ID)
            switch (target) {
                case 'user':
                    await gateModel.findOneAndUpdate({ NAME: 'GATE' }, { $set: { BANNED_USERS: list } }, { new: true });
                    break;
                case 'owner':
                    await gateModel.findOneAndUpdate({ NAME: 'GATE' }, { $set: { BANNED_OWNERS: list } }, { new: true });
                    break;
                case 'guild':
                    await gateModel.findOneAndUpdate({ NAME: 'GATE' }, { $set: { BANNED_GUILDS: list } }, { new: true });
                    break;
            }
            return true;
        }
    }
}