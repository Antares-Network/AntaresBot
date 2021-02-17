const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const channelCheck = require('../../functions/channelCheck')
const logToConsole = require('../../actions/logToConsole')

module.exports = class HelpCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'help',
            group: 'user',
            memberName: 'help',
            description: 'Shows the bot help embed',
            examples: ['help'],
            guildOnly: true
        });
    }

    async run(message) {
        if (await channelCheck.check(message) == true) {
            const Embed = new MessageEmbed()
                .setColor('#ff3505')
                .setURL('https://discord.gg/6pZ2wtGANP')
                .setTitle("Help, a list of commands")
                .setDescription("\n\n **8ball** or **ask**: Ask the bot a question and have it respond" +
                    "\n\n **random**: ❗❗COMMAND DISABLED FOR A REWRITE❗❗" +
                    "\n\n **cat**: Sends a random picture of a cat." +
                    "\n\n **dog**: Sends a random picture of a dog." +
                    "\n\n **reddit** or **meme**: ❗❗This command is disabled and is being rewritten to improve NSFW filtering❗❗" +
                    "\n\n **xkcd** or **comic**: Sends a random XKCD comic" +
                    "\n\n **github**: Sends an embed with a link to the github repo for the bot." +
                    "\n\n **prefix**: Shows the Prefix for the bot." +
                    "\n\n **invite**: Sends an invite for the bot and the support server." +
                    "\n\n **ping**: Sends the ping time of the bot." +
                    "\n\n **uptime**: Sends the uptime of the bot" +
                    "\n\n **privacy**: Sends in a dm, the privacy policy for the bot." +
                    "\n\n Join our support server: https://discord.gg/KKYw763")
                .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
            message.channel.send(Embed);
        }
        logToConsole.command(message.guild, message);
    }
};