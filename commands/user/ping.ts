import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";

export default {
    category: 'User',
    description: 'Sends the ping time of the bot.',

    slash: 'both',
    testOnly: true,

    callback: ({ client }) => {
        const pingEmbed = new MessageEmbed()
                .setColor('#ff3505')
                .setTitle('Bot/API Ping')
                .setDescription(`Ping: 🏓 | Latency is: **${client.ws.ping}**ms.`,)
                .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`);
        return pingEmbed;

    }
} as ICommand