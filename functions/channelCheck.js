const guildModel = require('../models/guild');
const gateModel = require('../models/gate');

module.exports = {
    check: async function (message) {
        const srv = await guildModel.findOne({ GUILD_ID: message.guild.id }); //find the entry for the guild
        const gate = await gateModel.findOne({ NAME: 'GATE' });
        let messageAuth = message.author;

        //check if the user has been banned from using the bot 
        if(gate.BANNED_USERS.includes(messageAuth.id)) {
            message.delete();
            message.channel.send(`<@${messageAuth.id}>, You are not allowed to use this bot.`)
            .then(msg => {
                msg.delete({ timeout: 10000 })
            })
            return;
        }

        //check if the user sent their message in the default channel
        if (message.channel.id != srv.GUILD_DEFAULT_CHANNEL) {
            if (srv.GUILD_DEFAULT_CHANNEL === null) {
                message.channel.send("The server owner has not set a default channel yet.\n If you are the server owner please use `&adefaultchannel (CHANNEL ID)`");
                return false; //exit the loop and don't parce the command
            } else {
                //ping the user in the default channel
                bot.channels.cache.get(srv.GUILD_DEFAULT_CHANNEL).send(`<@${messageAuth.id}> Please use me in this channel`)
                .then(msg => {
                    msg.delete({ timeout: 10000 })
                })
                return false;
            }
        } else {
            return true;
        }
    }
}