const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const channelCheck = require('../../functions/channelCheck')

module.exports = class DiceRollCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'diceroll',
            aliases: ["dice", "rolll", "rolldice"],
            group: 'user',
            memberName: 'diceroll',
            description: 'Rolls a die',
            examples: ['diceroll'],
            //clientPermissions: ['MANAGE_MESSAGES'],
            guildOnly: true
        });
    }

    async run(message) {
        if (await channelCheck.check(message) == true) {
            var outcome = Math.ceil(Math.random()*6)
            const preEmbed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle('Dice Roll 🎲')
            .setDescription(`${message.author.username} rolled a die. What side will it land on?\n Rolling...`,)
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png')
        const postEmbed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle('Dice Roll 🎲')
            .setThumbnail(`https://cdn.discordapp.com/attachments/761045738770792488/823616202513055744/dice2.gif`)
            .setDescription(`${message.author.username} rolled a  ${outcome}!`,)
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png')
            var MSG = await message.channel.send(preEmbed);
            setTimeout(async () => {
                MSG.edit(postEmbed)
            }, 3000);
        }
    }
};