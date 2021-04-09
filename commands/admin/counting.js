const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const logToConsole = require('../../actions/logToConsole')

module.exports = class CountCreateCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'counting',
            group: 'admin',
            memberName: 'counting',
            description: 'Allows an admin to setup a counting channel',
            examples: ['counting 788541416740487219'],
            guildOnly: true,
            clientPermissions: ['MANAGE_CHANNELS', 'MANAGE_MESSAGES'],
            userPermissions: ['MANAGE_CHANNELS'],
        });
    }

    run(message) {
        //message.delete();
        if (message.guild.channels.cache.find(channel => channel.name === "counting")){
            message.channel.send("You already have a counting channel. It is named `counting`") 
        } else {
            message.guild.channels.create('counting', {
                type: 'text',
            })
                .then((channel) => {
                    channel.setRateLimitPerUser(5, "It makes it easier for the bot to function.")
                    const Embed = new MessageEmbed()
                    .setColor('#ff3505')
                    //.setURL('https://discord.gg/6pZ2wtGANP')
                    .setTitle("Antares Bot Counting")
                    .setDescription("Welcome to your very own counting channel.\n" + 
                    "Please start counting from `1` using whole numbers.\n\n\n" + 
                    "**But first some rules:**" +
                    "\n\nThis channel has a `5 Second` slowmode" +
                    "\n\nYou must alternate players." + 
                    "\n\nYou may not send more than one number in a row")
                    .setFooter(`Delivered in: ${this.client.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
                    channel.send(Embed);
                })
        }
        logToConsole.command(message.guild, message);
    }
};