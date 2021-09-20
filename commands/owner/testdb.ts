import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
const gateModel = require('../../models/gate');


export default {
    category: 'Owner',
    description: 'tests the mongodb connection',
    slash: false,
    testOnly: true,
    guildOnly: true,
    ownerOnly: true,

    callback: async ({ client, message }) => {
        const doc = await gateModel.findOne({ NAME: 'GATE' });
        const Embed = new MessageEmbed()
            .setColor('#ff3505')
            //.setURL('https://dsc.gg/antaresnetwork')
            .setTitle('Fun Bot Stats!')
            .setThumbnail('https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png')
            .addFields(
                // { name: 'This guild\'s Member Count:', value: message.guild!.memberCount },
                { name: 'Total Bot users:', value: doc.TOTAL_USERS },
                { name: 'Total servers the bot is in:', value: doc.TOTAL_SERVERS },
                { name: 'Total messages everyone has sent to the bot:', value: doc.TOTAL_MESSAGES },
                { name: 'Last update time:', value: doc.UPDATE_TIME })
            .setDescription(`Remember to run \`&update\` before this to make sure the Database is up to date`)
            .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');

    }
} as ICommand