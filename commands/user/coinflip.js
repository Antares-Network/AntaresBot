const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const channelCheck = require('../../functions/channelCheck')

module.exports = class CoinFlipCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'coinflip',
            aliases: ["flip", "coin", "flipcoin", "headstails"],
            group: 'user',
            memberName: 'coinflip',
            description: 'Flips a coin. Heads or tails',
            examples: ['coinflip'],
            //clientPermissions: ['MANAGE_MESSAGES'],
            guildOnly: true
        });
    }

    async run(message) {

        if (await channelCheck.check(message) == true) {
            var outcome
            if (Math.round(Math.random()) == 0) {
                outcome = "Heads"
            } else {
                outcome = "Tails"
            }
            const preEmbed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle('Coin Flip💰')
            .setDescription(`${message.author.username} flipped a coin. What side will it land on?\n Flipping...`,)
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png')
        const postEmbed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle('Coin Flip 💰')
            .setThumbnail(`https://cdn.discordapp.com/attachments/761045738770792488/823404542782865408/a59e6a4122d931a9c452e4b1090b94c9.gif`)
            .setDescription(`${message.author.username} got ${outcome}!`,)
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png')
            var MSG = await message.channel.send(preEmbed);
            setTimeout(async () => {
                MSG.edit(postEmbed)
            }, 3000);
        }
    }
};


Math.round(Math.random());