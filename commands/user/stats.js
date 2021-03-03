const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const channelCheck = require('../../functions/channelCheck')
const logToConsole = require('../../actions/logToConsole')
const gateModel = require('../../models/gate');


module.exports = class StatsCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'stats',
            aliases: ['about'],
            group: 'user',
            memberName: 'stats',
            description: 'Sends a list of stats about the bot.',
            examples: ['stats'],
            guildOnly: true
        });
    }
    async run(message) {
        message.delete();
        if (await channelCheck.check(message) == true) {
            const doc = await gateModel.findOne({ NAME: 'GATE' });
            const Embed = new MessageEmbed()
                .setColor('#ff3505')
                //.setURL('https://dsc.gg/antaresnetwork')
                .setTitle('Fun Bot Stats!')
                .setThumbnail('https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png')
                .addFields(
                    { name: 'This guild\'s Member Count:', value: message.guild.memberCount },
                    { name: 'Total Bot users:', value: doc.TOTAL_USERS},
                    { name: 'Total servers the bot is in:', value: doc.TOTAL_SERVERS },
                    { name: 'Total messages everyone has sent to the bot:', value: doc.TOTAL_MESSAGES },
                    { name: 'Last update time:', value: doc.UPDATE_TIME})
                .setDescription(`Remember to run \`&update\` before this to make sure the Database is up to date`)
                .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');

            message.channel.send(Embed);
            logToConsole.command(message.guild, message);
        }
    }
};