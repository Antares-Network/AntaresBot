import { Message, MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import axios from 'axios';
import check from "../../functions/channelCheck"


export default {
    category: 'User',
    description: 'Sends a random dog image',
    aliases: ['doggo', 'puppy', 'woofer'],
    slash: false,
    testOnly: true,
    guildOnly: true,

    callback: async ({ client, channel, message }) => {
        if (await check.check(message, client)) {
            axios.get('https://dog.ceo/api/breeds/image/random')
                .then(function (response) {
                    const Embed = new MessageEmbed()
                    .setColor('#ff3505')
                    //.setURL('https://dsc.gg/antaresnetwork')
                    .setTitle('Random Dog Picture')
                    .setImage(response.data.message)
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