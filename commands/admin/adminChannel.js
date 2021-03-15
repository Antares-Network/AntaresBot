const { Command } = require('discord.js-commando');
const piiModel = require('../../models/pii');
const logToConsole = require('../../actions/logToConsole')


module.exports = class AdminChannelCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'adminchannel',
            group: 'admin',
            memberName: 'adminchannel',
            description: 'Sets the admin channel for the guild.',
            examples: ['adminchannel #channelMention'],
            guildOnly: true,
            //clientPermissions: ['MANAGE_CHANNELS'],
            userPermissions: ['ADMINISTRATOR']
        });
    }

    async run(message) {
        
        if (message.mentions.channels.first() == undefined) {
            message.channel.send("Please re-run this command and mention a channel as an argument.")
        } else {
            //check to see if an admin channel is set for this server yet
            const req = await piiModel.findOne({ GUILD_ID: message.guild.id });
            //if the server has an admin channel, send it here
            message.channel.send(`This server's admin channel was: <#${req.GUILD_ADMIN_CHANNEL}>`);
            const doc = await piiModel.findOneAndUpdate({ GUILD_ID: message.guild.id }, { $set: { GUILD_ADMIN_CHANNEL: message.mentions.channels.first().id } }, { new: true });
            message.channel.send(`Set the admin channel to <#${doc.GUILD_ADMIN_CHANNEL}>`);
            await doc.save();
            message.channel.send("`Having an admin channel set does not currently have any effect on the bot's performance.\n" +
                "An admin channel is not used currently, however it is recommended to set one up as it will be used in the near future`")
        }
        logToConsole.command(message.guild, message);
    }
};

