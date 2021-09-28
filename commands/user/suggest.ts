import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck"


export default {
    category: 'User',
    description: 'Suggest a new bot feature',
    slash: 'both',
    testOnly: true,
    guildOnly: true,

    callback: async ({ client, message, text }) => {
        if (await check.check(message, client)) {
            message.delete();
            const Embed = new MessageEmbed()
                .setColor('#ff3505')
                //.setURL('https://dsc.gg/antaresnetwork')
                .setTitle('New Bot Suggestion')
                .setThumbnail(`https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.jpeg`)
                .setDescription(`<@${message.author.id}> in the server **${message.guild!.name}** suggests:\n ${text}`,)
                .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
                message.channel.send(`Thank you <@${message.author.id}> for your suggestion. It has been received.`)
                client.users.fetch(String(process.env.BOT_OWNER_ID)).then(user => {
                    user.send({ embeds: [Embed]});
            });
        }
    }
} as ICommand