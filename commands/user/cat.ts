import { Message, MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import axios from 'axios';

export default {
    category: 'User',
    description: 'Sends a random cat image',
    slash: false,
    testOnly: true,
    guildOnly: true,

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
            }).catch((error) => {
                // Handle the error
                message.reply(`**\`Err:\`** Socket hang up. Please try again.`);
                console.log(error);
            });
            
    }
} as ICommand