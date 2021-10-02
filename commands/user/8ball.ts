import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck"

export default {
    name: "8ball",
    category: 'user',
    description: 'Answers all of the questions you might have',
    example: 'ask Am i a dum dum?',
    aliases: ['8-ball', 'ask', 'why'],
    slash: false,
    guildOnly: true,
    requiredPermissions: ['SEND_MESSAGES'],


    callback: async ({ client, message, text }) => {
        if (await check.check(message, client)) {
            let eightball = [
            'It is certain.',
            'It is decidedly so.',
            'Without a doubt.',
            'Yes definitely.',
            'You may rely on it.',
            'As I see it, yes.',
            'Most likely.',
            'Outlook good.',
            'Yes.',
            'Signs point to yes.',
            'Reply hazy try again.',
            'Ask again later.',
            'Better not tell you now.',
            'Cannot predict now.',
            'Concentrate and ask again.',
            'Don\'t count on it.',
            'My reply is no.',
            'My sources say no.',
            'Outlook not so good.',
            'Very doubtful.',
            'No way.',
            'Maybe',
            'The answer is hiding inside you',
            'No.',
            'Depends on the mood of the CS god',
            'Hang on',
            'It\'s over',
            'It\'s just the beginning',
            'Good Luck',
            ];
            let index = (Math.floor(Math.random() * Math.floor(eightball.length)));
            const Embed = new MessageEmbed()
                .setColor('#ff3505')
                //.setURL('https://dsc.gg/antaresnetwork')
                .setTitle('Get an answer to all your questions')
                .setThumbnail(`https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.jpeg`)
                .setDescription(`${message.author.username} asks:\n ${text}\n\n **My Answer:**\n ${eightball[index]}`,)
                .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
            return Embed;
        }
    }
} as ICommand;
