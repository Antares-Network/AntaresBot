const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');

const channelCheck = require('../../functions/channelCheck')
const logToConsole = require('../../actions/logToConsole')

module.exports = class InviteCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'invite',
            group: 'user',
            memberName: 'invite',
            description: 'Sends an invite for the bot and the support server.',
            examples: ['invite'],
            guildOnly: true
        });
    }

    async run(message) {
        if (await channelCheck.check(message) == true) {
            message.channel.send("https://discord.com/oauth2/authorize?client_id=736086156759924762&scope=bot&permissions=67497032");
            const Embed = new MessageEmbed()
                .setColor('#ff3505')
                .setURL('https://discord.gg/6pZ2wtGANP')
                .setTitle("Thank you showing interest in me!")
                .setDescription("If you would like to join our support/community server, click the link below:" +
                    "\nhttps://discord.gg/6pZ2wtGANP")
                .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
            message.author.send(Embed);
            logToConsole.command(message.guild, message);
        }
    }
};