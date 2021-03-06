const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const channelCheck = require('../../functions/channelCheck')
const logToConsole = require('../../actions/logToConsole')


module.exports = class SuggestCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'suggest',
            group: 'user',
            memberName: 'suggest',
            description: 'Suggest a new bot feature',
            examples: ['suggest add tictactoe to the bot'],
            args: [
                {
                    key: 'text',
                    prompt: 'Please type your suggestion here. \`Markdown formatting supported\`',
                    type: 'string'
                }
            ],
            guildOnly: true
        });
    }

    async run(message, { text }) {
        if (await channelCheck.check(message) == true) {
            const Embed = new MessageEmbed()
            .setColor(config.defaultEmbedColor)
                //.setURL('https://dsc.gg/antaresnetwork')
                .setTitle('New Bot Suggestion')
                .setThumbnail(`https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.jpeg`)
                .setDescription(`<@${message.author.id}> in the server **${message.guild.name}** suggests:\\n ${text}`,)
                .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, config.embedFooterIcon);


            bot.users.fetch('603629606154666024', false).then((user) => {
                user.send(Embed);
            message.channel.send(`Thank you for your suggestion. It has been received.`)
            });
        }
        //send to the console that this command was run
        logToConsole.command(message.guild, message);
    }
}
