import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import gateModel from '../../models/gate';
import guildModel from '../../models/guild';
import check from "../../functions/channelCheck"

export default {
    category: 'User',
    description: 'Updates the gate model/stats of the bot',
    slash: 'both',
    guildOnly: true,

    callback: async ({ client, channel, message }) => {
        if (await check.check(message, client)) {
            const gate = await gateModel.findOne({ NAME: 'GATE' })
            //message.delete()
            const preEmbed = new MessageEmbed()
                .setColor('#ff3505')
                .setTitle('Updating database')
                .setDescription(`Please wait up to 20 seconds`,)
                .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
            const postEmbed = new MessageEmbed()
                .setColor('#ff3505')
                .setTitle('Database Updated')
                .setDescription(`Database has been successfully updated\n Run \`&stats\` to see the updated server stats`)
                .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');


            let MSG = await channel.send({embeds: [preEmbed]});
            //var init and gc
            let totalUsers = 0;
            let totalMessages = 0;
            let totalOwners: Array<string> = [];
            //get data from all the guilds
            client.guilds.cache.forEach(async guild => {
                if (!gate.IGNORED_GUILDS.includes(guild.id)) {
                    const doc = await guildModel.findOne({ GUILD_ID: guild.id }); //find the doc that has all the guild information in it
                    totalMessages += Number(doc.GUILD_MESSAGES);
                    totalOwners.push(guild.ownerId);
                    totalUsers += guild.memberCount
                } else {
                    console.log(`${guild.name} was excluded`)
                }
            });

            setTimeout(async () => {
                var d = new Date();
                await gateModel.findOneAndUpdate({ NAME: 'GATE' }, {
                    $set: {
                        GUILD_OWNER_ID: totalOwners,
                        TOTAL_MESSAGES: totalMessages,
                        TOTAL_SERVERS: client.guilds.cache.size,
                        TOTAL_USERS: totalUsers,
                        UPDATE_TIME: d.toString()
                    }
                }, { new: true });
                MSG.edit({embeds: [postEmbed]});
            }, 5000);
        }
    }
} as ICommand