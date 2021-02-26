const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const logToConsole = require('../../actions/logToConsole')

module.exports = class ServerListCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'serverlist',
            group: 'owner',
            memberName: 'serverlist',
            description: 'Sends a list of all the servers the bot is in to the bot owner',
            examples: ['serverlist']
        });
    }
    hasPermission(msg) {
        //msg.channel.send("Only the bot owner can use this command.")
        return this.client.isOwner(msg.author);
    }

    run(message) {
        var d = new Date();
        //get the list of guilds the bot is in
        var guildList = bot.guilds.cache;
        try {
            guildList.forEach(async guild => {
                const Embed = new MessageEmbed()
                    .setColor('#ff3505')
                    .setTitle(`Server: ${guild.name}`)
                    .setThumbnail(guild.iconURL())
                    .addFields(
                        { name: 'Guild Creation Date:', value: guild.createdAt },
                        { name: 'Guild Join Date:', value: d.toString() },
                        { name: 'Guild Name:', value: guild.name },
                        { name: 'Guild ID:', value: guild.id },
                        { name: 'Owner ID:', value: guild.ownerID },
                        { name: 'Guild Member Count:', value: guild.memberCount })
                    .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
                message.author.send(Embed);
            });
            logToConsole.command(message.guild, message);
        } catch (err) {
            //if there was an error send it here
            console.log(err);
        }
    }
}