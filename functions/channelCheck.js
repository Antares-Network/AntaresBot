const piiModel = require('../models/pii');
const { MessageEmbed } = require('discord.js');
const gateModel = require('../models/gate');

module.exports = {
    async check (message) {
        const srv = await piiModel.findOne({ GUILD_ID: message.guild.id }); //find the entry for the guild
        const gate = await gateModel.findOne({ NAME: 'GATE' });

        //check if the user has been banned from using the bot 
        if (gate.BANNED_GUILDS.includes(message.guild.id)) {
            message.delete();
            const banEmbed = new MessageEmbed()
                .setColor('#ff3505')
                .setTitle('Guild ban notice')
                .setDescription(`<@${message.author.id}>, This guild has been banned from using this bot by the owner.`,);
            message.channel.send(banEmbed)
                .then(msg => {
                    msg.delete({ timeout: 20000 })
                })
            return;
        }

        //check if the user has been banned from using the bot 
        if (gate.BANNED_USERS.includes(message.author.id)) {
            message.delete();
            const banEmbed = new MessageEmbed()
                .setColor('#ff3505')
                .setTitle('User ban notice')
                .setDescription(`<@${message.author.id}>, You have been banned from using this bot by the owner.`,);
            message.channel.send(banEmbed)
                .then(msg => {
                    msg.delete({ timeout: 20000 })
                })
            return;
        }

        //check if the user sent their message in the default channel
        if (message.channel.id != srv.GUILD_DEFAULT_CHANNEL) {
            if (srv.GUILD_DEFAULT_CHANNEL === null) {
                message.channel.send("The server owner has not set a default channel yet.\n If you are the server owner please use `&setup #channel`");
                return false; //exit the loop and don't parse the command
            } else {
                //ping the user in the default channel
                bot.channels.cache.get(srv.GUILD_DEFAULT_CHANNEL).send(`<@${message.author.id}> Please use me in this channel`)
                    .then(msg => {
                        msg.delete({ timeout: 15000 })
                    })
                return false;
            }
        } else {
            return true;
        }
    }
}