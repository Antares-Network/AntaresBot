import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck"


export default {
    category: 'User',
    description: 'Rolls a die',
    slash: false,
    aliases: ["dice", "roll", "rolldice"],
    testOnly: true,
    guildOnly: true,

    callback: async ({ client, message }) => {
        if (await check.check(message, client)) {
            var outcome = Math.ceil(Math.random()*6)
                const preEmbed = new MessageEmbed()
                .setColor('#ff3505')
                .setTitle('Dice Roll 🎲')
                .setDescription(`${message.author.username} rolled a die. What side will it land on?\n Rolling...`,)
                .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png')
            const postEmbed = new MessageEmbed()
                .setColor('#ff3505')
                .setTitle('Dice Roll 🎲')
                .setThumbnail(`https://playantares.com/resources/antaresbot/diceroll.gif`)
                .setDescription(`${message.author.username} rolled a ${outcome}!`,)
                .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png')
            var MSG = await message.reply({embeds: [preEmbed]});
            setTimeout(async () => {
                MSG.edit({embeds: [postEmbed]})
            }, 3000);
        }
    }
} as ICommand
