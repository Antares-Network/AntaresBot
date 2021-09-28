import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";

export default {
    category: 'User',
    description: 'Sends the ping time of the bot.',
    slash: 'both',
    testOnly: true,
    guildOnly: true,

    callback: ({ client }) => {
        const Embed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle('Bot/API Ping')
            .setDescription(`Ping: 🏓 | Latency is: **${client.ws.ping}**ms.`,)
            .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
        return Embed;

    }
} as ICommand