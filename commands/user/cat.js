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
        .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
    message.channel.send(Embed);
    //logToConsole.command(message.guild, message);
}

module.exports = class CatCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'cat',
            aliases: ['kitten', 'meow'],
            group: 'user',
            memberName: 'cat',
            description: 'Sends a random cat image',
            examples: ['cat'],
            //clientPermissions: ['MANAGE_MESSAGES'],
            guildOnly: true
        });
    }
    async run(message) {
        //message.delete()
        if (await channelCheck.check(message) == true) {
            //request a cat from the api
            fetch('http://aws.random.cat/meow')
                .then((response) => {
                    if (response.status >= 200 && response.status <= 299) {
                        return response.json();
                    } else {
                        throw Error(response.statusText);
                    }
                })
                .then((json) => {
                    embed(message, json.file, 'Random Cat Picture')
                }).catch((error) => {
                    // Handle the error
                    message.channel.send(`**\`Err:\`** Socket hang up. Please try again.`);
                    console.log(error);
                });
        }
        //send to the console that this command was run
        logToConsole.command(message.guild, message);
    }
};