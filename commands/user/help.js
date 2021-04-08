const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
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
        const Embed = new MessageEmbed()
            .setColor(config.defaultEmbedColor)
            //.setURL('https://dsc.gg/antaresnetwork')
            .setTitle("Help, a list of commands")
            .setDescription("**8ball** or **ask**: Ask the bot a question and have it respond" +
                "\n\n **random**: Sends a random thing. Run command for more info." +
                "\n\n **cat**: Sends a random picture of a cat." +
                "\n\n **coinflip**: Flips a coin." +
                "\n\n **diceroll**: Rolls a die" +
                "\n\n **sneeze**: Makes the bot sneeze lol." +
                "\n\n **suggest**: Sends a suggestion to the bot developer." +
                "\n\n **dog**: Sends a random picture of a dog." +
                "\n\n **stats** and **update**: Updates the database and shows the bots most recent stats." +
                "\n\n **reddit** or **meme**: ❗❗Must be used inside a NSFW channel❗❗" +
                "\n\n **xkcd** or **comic**: Sends a random XKCD comic" +
                "\n\n **github**: Sends an embed with a link to the github repo for the bot." +
                "\n\n **prefix**: Shows the Prefix for the bot." +
                "\n\n **invite**: Sends an invite for the bot and the support server." +
                "\n\n **ping**: Sends the ping time of the bot." +
                "\n\n **uptime**: Sends the uptime of the bot" +
                "\n\n **privacy**: Sends in a dm, the privacy policy for the bot." +
                "\n\n **counting**: In admin help. Creates a server counting channel" +
                "\n\n **adminhelp**: Sends the help page with admin commands." +
                "\n\n Join our support server: https://dsc.gg/antaresnetwork")
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, config.embedFooterIcon);
        message.channel.send(Embed);
        logToConsole.command(message.guild, message);
    }
};