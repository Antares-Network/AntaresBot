const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const logToConsole = require('../../actions/logToConsole');
const piiModel = require('../../models/pii');
const gateModel = require('../../models/gate');

module.exports = class GuildMSGCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'guildmsg',
            group: 'owner',
            memberName: 'guildmag',
            description: 'Sends a message to every guild the bot is in',
            examples: ['guildmsg HI'],
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

    async run(message, { text }) {
        const gate = await gateModel.findOne({ NAME: 'GATE' })
        //get the list of guilds the bot is in
        var guildList = bot.guilds.cache;
        //console.log(text)

        try {
            //send a message to every guild this bot is in
            let embed = new MessageEmbed()
                .setColor('#ff3505')
                .setURL('https://discord.gg//KKYw763')
                .setTitle("Antares Bot -- System Update Message")
                .setDescription('I have just flown in to tell you that my developers have something to say:')
                .addField('Message:', `${text}`)
                .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
            guildList.forEach(async guild => {
                if(gate.IGNORED_GUILDS.includes(guild.id)) return;
                const doc = await piiModel.findOne({ GUILD_ID: guild.id }); //find the entry for the guild
                if (doc.GUILD_DEFAULT_CHANNEL != null) {
                    //send the message in the default channel for this guild
                    bot.channels.cache.get(doc.GUILD_DEFAULT_CHANNEL).send(embed)
                } else {
                    guild.channels.cache.find(c => c.type === 'text').send(embed)
                }
            });
            logToConsole.command(message.guild, message);
        } catch (err) {
            //if there was an error send it here
            console.log(err);
        }
    }
}