import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import axios from 'axios';
import check from "../../functions/channelCheck"

export default {
    category: 'User',
    description: 'Gets a comic from xkcd',
    aliases: ['xkcd'],
    slash: false,
    guildOnly: true,

    callback: async ({ client, channel, message }) => {
        if (await check.check(message, client)) {
            let comicNum = Math.floor(Math.random() * 2520);
            axios.get(`http://xkcd.com/${comicNum}/info.0.json`)
            .then(function (response) {
                const Embed = new MessageEmbed()
                .setColor('#ff3505')
                //.setURL('https://dsc.gg/antaresnetwork')
                .setTitle('Random Cat Picture')
                .setImage(response.data.img)
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