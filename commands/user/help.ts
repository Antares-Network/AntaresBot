import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import chalk from 'chalk'

export default {
    name: 'help',
    category: 'user',
    description: 'Shows the bot help embed',
    slash: 'both',
    testOnly: true,
    guildOnly:  true,
    requiredPermissions: ['SEND_MESSAGES'],

    callback: ({ channel, message, client }) => {
        console.log(`${chalk.red('COMMAND')} [${chalk.green(channel.guild.name)}] [${chalk.blue(channel.name)}] [${chalk.yellow(message.author.username)}] ${chalk.grey('--')} ${chalk.cyan(message.content)}`)
        const Embed = new MessageEmbed()
            .setColor('#ff3505')
            //.setURL('https://dsc.gg/antaresnetwork')
            .setTitle("Help, a list of commands")
            .setDescription("**8ball** or **ask**: Ask the bot a question and have it respond" +
                "\n\n **random**: Sends a random thing. Run command for more info." +
                "\n\n **cat**: Sends a random picture of a cat." +
                "\n\n **flip**: Flips a coin." +
                "\n\n **roll**: Rolls a die" +
                "\n\n **sneeze**: Makes the bot sneeze lol." +
                "\n\n **suggest**: Sends a suggestion to the bot developer." +
                "\n\n **dog**: Sends a random picture of a dog." +
                "\n\n **stats** and **update**: Updates the database and shows the bots most recent stats." +
                "\n\n **reddit** or **meme**: ❗❗Currently disabled while it is being re-written❗❗" +
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
            .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
        return Embed
    }
} as ICommand