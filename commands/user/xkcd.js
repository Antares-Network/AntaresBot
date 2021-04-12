const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const channelCheck = require('../../functions/channelCheck')
const logToConsole = require('../../actions/logToConsole')



function embed(message, img, title) {
    const Embed = new MessageEmbed()
        .setColor('#ff3505')
        //.setURL('https://dsc.gg/antaresnetwork')
        .setTitle(title)
        .setImage(img)
        .setFooter(`Delivered in: ${Date.now() - message.createdTimestamp}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
    message.channel.send(Embed);
}

module.exports = class XkcdCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'xkcd',
            aliases: ['comic', 'cartoon'],
            group: 'user',
            memberName: 'xkcd',
            description: 'Sends a random XKCD comic',
            examples: ['xkcd'],
            //clientPermissions: ['MANAGE_MESSAGES'],
            guildOnly: true
        });
    }
    async run(message) {
        //message.delete()
        if (await channelCheck.check(message) == true) {
            let comicNum = Math.floor(Math.random() * 2413);
            fetch(`http://xkcd.com/${comicNum}/info.0.json`)
            .then((response) => {
                if (response.status >= 200 && response.status <= 299) {
                    return response.json();
                } else {
                    throw Error(response.statusText);
                }
            })
            .then((json) => {
                embed(message, json.img, 'Random Comic from XKCD')
            }).catch((error) => {
                // Handle the error
                message.channel.send(`**\`Err:\`** Socket hang up. Please try again.`);
                console.log(error);
            });
            //send to the console that this command was run
            logToConsole.command(message.guild, message);
        }
    }
};