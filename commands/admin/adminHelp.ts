import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import adminChanCheck from '../../functions/adminChanCheck'

export default {
    category: 'admin',
    description: 'Shows the bot\'s admin help embed',
    aliases: ['ahelp', 'aHelp'],
    guildOnly:  true,
    requiredPermissions: ['MANAGE_GUILD'],

    callback: async ({ message, client }) => {
        if(await adminChanCheck.check(message, client)) {
            const Embed = new MessageEmbed()
                    .setColor('#ff3505')
                    .setURL('https://discord.gg/KKYw763')
                    .setTitle("Admin Help, a list of commands")
                    .setDescription("**setup**: Sets the channel the bot will talk in" +
                        "\n\n **admin** or **adminChannel**: Sets the channel the bot will send admin messages in" +
                        "\n\n **counting**: Creates a channel to be used for a counting game" +
                        "\n\n**remove**: Gives information on how to request all data for the server be removed" +
                        "\n\n **say** or **echo**: Lets you make the bot say something. Careful, this is monitored for abuse" +
                        "\n\nJoin our support server: https://dsc.gg/antaresnetwork")
                        .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
            return Embed
        }
    }
} as ICommand