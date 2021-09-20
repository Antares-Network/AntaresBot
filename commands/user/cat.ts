import { Message, MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import axios from 'axios';

export default {
    category: 'User',
    description: 'Sends a random cat image',
    slash: 'both',
    testOnly: true,

    callback: ({ client, message }) => {
        axios.get('https://aws.random.cat/meow')
            .then(function (response) {
                const Embed = new MessageEmbed()
                .setColor('#ff3505')
                //.setURL('https://dsc.gg/antaresnetwork')
                .setTitle('Random Cat Picture')
                .setImage(response.data.file)
                .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
                return Embed;
            });
    }
} as ICommand