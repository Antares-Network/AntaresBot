import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";

export default {
    category: 'Owner',
    description: 'Sends a message about the server owner',
    slash: false,
    testOnly: true,
    ownerOnly: true,
    hidden: true,

    callback: ({ client, message }) => {
        const Embed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle(`Hey its my developer Nate`)
            .setThumbnail(`https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.jpeg`)
            .setDescription(`<@${message.author.id}> is my owner and coded me. Ask him anything you might need :)`,)
            .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
        return Embed;

    }
} as ICommand