const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const mcdata = require('mcdata')


module.exports = class McCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'mcuser',
            group: 'antares',
            memberName: 'mcuser',
            description: 'Finds out all the information about a user of the bot',
            examples: ['mcuser'],
            args: [
                {
                    key: 'ign',
                    prompt: 'Please enter a valid username',
                    type: 'string'
                }
            ],
            guildOnly: true
        });
    }

    async run(message, { ign }) {
        const player = await mcdata.playerStatus(ign, { renderSize: 512 })
        console.log(player)

        const Embed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle(`${player.username} Player Information`)
            .setThumbnail(player.skin.fullBody)
            .addFields(
                { name: 'Username:', value: player.username },
                { name: 'UUID:', value: player.uuid })
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
        message.channel.send(Embed);
    }
}