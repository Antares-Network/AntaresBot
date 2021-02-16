const { Command } = require('discord.js-commando');
const guildModel = require('../../models/guild');
const logToConsole = require('../../actions/logToConsole')


module.exports = class DefaultChannelCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'defaultchannel',
            aliases: ["setup"],
            group: 'admin',
            memberName: 'defaultchannel',
            description: 'Sets the admin channel for the guild.',
            examples: ['defaultchannel "CHANNELID"'],
            args: [
                {
                    key: 'text',
                    prompt: 'You are trying to setup/ set a default channel for this bot. Please provide the channel id that you want to become this bot\'s default channel',
                    type: 'string'
                }
            ],
            guildOnly: true,
            userPermissions: ['ADMINISTRATOR']
        });
    }

    async run(message, { text }) {
        //check to see if a default channel is set for this server yet
        const req = await guildModel.findOne({ GUILD_ID: message.guild.id });
        //if the server has a default channel, send it here
        message.channel.send(`This server's default channel is: <#${req.GUILD_DEFAULT_CHANNEL}>`);
        if (!isNaN(text)) {
            const doc = await guildModel.findOneAndUpdate({ GUILD_ID: message.guild.id }, { $set: { GUILD_DEFAULT_CHANNEL: text } }, { new: true });
            message.channel.send(`Set the default channel to <#${doc.GUILD_DEFAULT_CHANNEL}>`);
            await doc.save();
        }
        logToConsole.command(message.guild, message);
    }
};

