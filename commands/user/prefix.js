const { Command } = require('discord.js-commando');
const guildModel = require('../../models/guild');

module.exports = class PrefixCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'prefix',
            group: 'user',
            memberName: 'prefix',
            description: 'Replies the bot prefix',
            examples: ['prefix'],
            guildOnly: true
        });
    }

    async run(message) {
        //check to see if a prefix has already been set up for this guild and grab it if it exists already
        const doc = await guildModel.findOne({ GUILD_ID: message.guild.id });
        //if the guild has a prefix, send it here
        message.channel.send(`This server's prefix is: **${doc.prefix}**`);
    }
};