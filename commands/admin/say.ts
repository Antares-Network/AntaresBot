import { MessageEmbed, TextChannel } from 'discord.js';
import { ICommand } from "wokcommands";

export default {
    category: 'Admin',
    description: 'Makes the bot say something',
    slash: false,
    expectedArgs: '<channel>',
    minArgs: 1,
    permissions: ['ADMINISTRATOR'],


    callback: ({ client, message, args, text }) => {

        message.delete()

        let id = message.mentions.channels.first()?.id;
        if (id) {
            const mentionedChannel = client.channels.cache.get(id) as TextChannel;
            try{
                mentionedChannel.send(text.replace(args[0], ''));
            } catch(e) {
                message.channel.send(`Error: ${e}`);
            }
        } else {
            message.channel.send(text)


        console.log(message.content)
        console.log(args)
        console.log(text)
    }
}
} as ICommand