import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";

export default {
    category: 'User',
    description: 'Sends the version number of the bot',

    slash: 'both',
    testOnly: true,

    callback: ({ client }) => {
        const Embed = new MessageEmbed()
                .setColor('#ff3505')
                .setTitle('Version:')
                .setDescription(`I am running version: ${process.env.VERSION}`)
                .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
        return Embed;

    }
} as ICommand