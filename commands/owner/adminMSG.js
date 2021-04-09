//This command is used only by the bot owner to send critical messages to a server's admin channel
//it is ONLY USED IN CRITICAL SITUATIONS, such as security bugs, data breaches, etc
//Every attempt is made to not use this function , such as sending a dm to the server owner, et 
//before this command is used.


const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const piiModel = require('../../models/pii');
const logToConsole = require('../../actions/logToConsole')

module.exports = class AdminMSGCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'adminmsg',
            group: 'owner',
            memberName: 'adminmsg',
            description: 'Sends an adminmessage to every guild the bot is in',
            examples: ['adminmsg HI'],
            args: [
                {
                    key: 'text',
                    prompt: 'Please enter your message',
                    type: 'string'
                }
            ],
            guildOnly: true
        });
    }
    hasPermission(msg) {
        msg.channel.send("Only the bot owner can use this command.")
        return this.client.isOwner(msg.author);
    }

    run(message, { text }) {
        //get the list of guilds the bot is in
        var guildList = this.client.guilds.cache;

        try {
            //send a message to every guild this bot is in
            let messageToSend = new MessageEmbed()
                .setColor('#ff3505')
                .setURL('https://discord.gg/KKYw763')
                .setTitle("Admin Message / Notice")
                .setDescription('I have an important message from my Developers')
                .addField('Message:', `${text}`)
                .setFooter(`Delivered in: ${this.client.ws.ping}ms | Antares Bot`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
            guildList.forEach(async guild => {
                const doc = await piiModel.findOne({ GUILD_ID: guild.id }); //find the entry for the guild
                if (doc.GUILD_ADMIN_CHANNEL != null) {
                    //send the message in the default channel for this guild
                    this.client.channels.cache.get(doc.GUILD_ADMIN_CHANNEL).send(messageToSend)
                } else {
                    message.channel.send(`I was not able to send a message to the guild named: \`${guild.name}\`, ID: \`${guild.id}\``)
                }
            });
            logToConsole.command(message.guild, message);
        } catch (err) {
            //if there was an error send it here
            console.log(err);
        }
    }
}