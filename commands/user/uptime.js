const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const channelCheck = require('../../functions/channelCheck')
module.exports = class UptimeCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'uptime',
            group: 'user',
            memberName: 'uptime',
            description: 'Sends the uptime of the bot',
            examples: ['uptime'],
            //clientPermissions: ['MANAGE_MESSAGES'],
            guildOnly: true
        });
    }

    async run(message) {
        //message.delete();
        if (await channelCheck.check(message) == true) {
            let days = Math.floor(bot.uptime / 86400000);
            let hours = Math.floor(bot.uptime / 3600000) % 24;
            let minutes = Math.floor(bot.uptime / 60000) % 60;
            let seconds = Math.floor(bot.uptime / 1000) % 60;
            const Embed = new MessageEmbed()
                .setColor(config.defaultEmbedColor)
                .setTitle('Bot Uptime')
                .setDescription(`I have been online for ${days}d ${hours}h ${minutes}m ${seconds}s`,)
                .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, config.embedFooterIcon)
            message.channel.send(Embed);
        }
    }
};