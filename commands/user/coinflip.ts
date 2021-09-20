import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";

export default {
    category: 'User',
    description: 'Flips a coin',
    slash: 'both',
    aliases: ["flip", "coin", "flipcoin", "headstails"],
    testOnly: true,
    guildOnly: true,

    callback: async ({ client, message }) => {
        var outcome = (Math.round(Math.random()) == 0) ? "Tails" : "Heads";
        const preEmbed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle('Coin Flip 💰')
            .setDescription(`${message.author.username} flipped a coin. What side will it land on?\n Flipping...`,)
            .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
        const postEmbed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle('Coin Flip 💰')
            .setThumbnail(`https://playantares.com/resources/antaresbot/coinflip.gif`)
            .setDescription(`${message.author.username} got ${outcome}!`,)
            .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
        var MSG = message.channel.send(preEmbed);
        setTimeout(async () => {
            MSG.edit(postEmbed)
        }, 3000);

    }
} as ICommand
