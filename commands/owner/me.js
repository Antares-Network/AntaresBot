const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');


module.exports = class MeCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'me',
            group: 'owner',
            memberName: 'me',
            description: 'Says that im the server owner ',
            examples: ['me'],
            guildOnly: true
        });
    }

    hasPermission(msg) {
        return this.client.isOwner(msg.author);
    }
    async run(message) {
        const Embed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle(`Hey its my developer Nate`)
            .setThumbnail(`https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.jpeg`)
            .setDescription(`<@${message.author.id}> is my owner and coded me. Ask him anything you might need :)`,)
            .setFooter(`Delivered in: ${this.client.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
        message.channel.send(Embed)
    }
};