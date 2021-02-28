const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const channelCheck = require('../../functions/channelCheck')
const logToConsole = require('../../actions/logToConsole')


module.exports = class EightBallCommand extends Command {
    constructor(client) {
        super(client, {
            name: '8ball',
            aliases: ['8-ball', 'ask', 'why'],
            group: 'user',
            memberName: '8ball',
            description: 'Answers all of the questions you might have',
            examples: ['8ball Am i a looser'],
            args: [
                {
                    key: 'text',
                    prompt: 'Please ask me a question',
                    type: 'string'
                }
            ],
            guildOnly: true
        });
    }

    async run(message, { text }) {

        if (await channelCheck.check(message) == true) {
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
            //message.channel.send(eightball[index]);
            const EightBallEmbed = new MessageEmbed()
            .setColor('#ff3505')
            .setURL('https://dsc.gg/antaresnetwork')
            .setTitle('Get an answer to all your questions')
            .setThumbnail(`https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.jpeg`)
            .setDescription(`${message.author.username} asks:\n ${text}\n\n **My Answer:**\n ${eightball[index]}`,)
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
        message.channel.send(EightBallEmbed);
        }
        //send to the console that this command was run
        logToConsole.command(message.guild, message);
    }
}