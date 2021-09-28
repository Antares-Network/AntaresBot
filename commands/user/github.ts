import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck"


export default {
    category: 'User',
    description: 'Sends an embed with a link to the github repo for the bot.',
    slash: false,
    testOnly: true,
    guildOnly: true,

    callback: async ({ client, message }) => {
        if (await check.check(message, client)) {
            const Embed = new MessageEmbed()
                .setColor('#ff3505')
                .setURL('https://dsc.gg/antaresnetwork')
                .setThumbnail('https://playantares.com/resources/icon.png')
                .setTitle('Github')
                .setDescription('Click here to go to the Antares Bot Github repo: \n https://github.com/Antares-Network/AntaresBot')
                .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
            return Embed;
        }
    }
} as ICommand