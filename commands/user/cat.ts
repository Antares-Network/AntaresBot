import { Message, MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck"
import axios from 'axios';

export default {
    category: 'User',
    description: 'Sends a random cat image',
    aliases: ['kitty', 'kitten',],
    slash: false,
    guildOnly: true,

    callback: async({ client, message, channel }) => {
        if (await check.check(message, client)) {
            axios.get('https://aws.random.cat/meow')
                .then(function (response) {
                    const Embed = new MessageEmbed()
                    .setColor('#ff3505')
                    .setTitle('Random Cat Picture')
                    .setImage(response.data.file)
                    .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
                    channel.send({embeds: [Embed]});
                }).catch((error) => {
                    // Handle the error
                    console.log(error);
                    return(`**\`Err:\`** Socket hang up. Please try again.`);
            });
        }
    }
} as ICommand