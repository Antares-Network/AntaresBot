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
        .setFooter(`Delivered in: ${this.client.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
    message.channel.send(Embed);
    //logToConsole.command(message.guild, message);
}

module.exports = class DogCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'dog',
            aliases: ['puppy', 'doggo'],
            group: 'user',
            memberName: 'dog',
            description: 'Sends a random dog image',
            examples: ['dog'],
            //clientPermissions: ['MANAGE_MESSAGES'],
            guildOnly: true
        });
    }
    async run(message) {
        //message.delete()
        if (await channelCheck.check(message) == true) {
            //request a cat from the api
            fetch('https://dog.ceo/api/breeds/image/random')
                .then(res => res.json())
                .then(json => embed(message, json.message, 'Random Dog Picture'));
        }
        //send to the console that this command was run
        logToConsole.command(message.guild, message);
    }
};