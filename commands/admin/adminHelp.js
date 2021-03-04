const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const channelCheck = require('../../functions/channelCheck')
const logToConsole = require('../../actions/logToConsole')

module.exports = class AdminHelpCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'adminhelp',
            group: 'admin',
            memberName: 'adminhelp',
            description: 'Shows the bot\'s admin help embed',
            examples: ['adminhelp'],
            guildOnly: true
        });
    }

    async run(message) {
            const Embed = new MessageEmbed()
                .setColor('#ff3505')
                .setURL('https://discord.gg/6pZ2wtGANP')
                .setTitle("Admin Help, a list of commands")
                .setDescription("**setup**: Sets the channel the bot will talk in" +
                "\nBot Permissions needed: MANAGE_CHANNELS" +
                "\nUser Permissions needed: ADMINISTRATOR" +
                    "\n\n **adminchannel**: Sets the channel the bot will send admin messages in" +
                    "\nBot Permissions needed: MANAGE_CHANNELS" +
                    "\nUser Permissions needed: ADMINISTRATOR" +
                    
                    "\n\n **counting**: Creates a channel to be used for a counting game" +
                    "\nBot Permissions needed: MANAGE_CHANNELS, MANAGE_MESSAGES" +
                    "\nUser Permissions needed: MANAGE_CHANNELS" +

                    "\n\n**remove**: Gives information on how to request all data for the server be removed" +
                    "\nUser Permissons needed: ADMINISTRATOR" +
                    "\n\n **say** or **echo**: Lets you make the bot say something. Careful, this is monitored for abuse" +
                    "\nUser Permissons needed: ADMINISTRATOR" +
                    "\n\nJoin our support server: https://discord.gg/KKYw763")
                .setFooter(`Delivered in: ${Date.now() - message.createdTimestamp}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
            message.channel.send(Embed);
        logToConsole.command(message.guild, message);
    }
};