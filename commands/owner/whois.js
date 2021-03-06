const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const gateModel = require('../../models/gate');

module.exports = class WhoisCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'whois',
            group: 'owner',
            memberName: 'whois',
            description: 'Finds out all the information about a user of the bot',
            examples: ['whois'],
            args: [
                {
                    key: 'type',
                    prompt: 'Please enter a valid user ID',
                    type: 'string'
                },
                {
                    key: 'id',
                    prompt: 'Please enter a valid user ID',
                    type: 'string'
                }
            ],
            clientPermissions: ['MANAGE_MESSAGES'],
            userPermissions: ['ADMINISTRATOR'],
            guildOnly: true
        });
    }
    hasPermission(msg) {
        return this.client.isOwner(msg.author);
    }

    run(message, { type, id }) {
        message.delete()

        if (type.toLowerCase() == 'user') {
            try{
            bot.users.fetch(id, false).then(async (user) => {

                const gate = await gateModel.findOne({ NAME: 'GATE' }); //find the entry for the guild
                var bannedUsers = gate.BANNED_USERS
                var userIsBanned = 'No';
                var bannedOwners = gate.BANNED_OWNERS
                var ownerIsBanned = 'No';

                for (var i = 0; i < bannedUsers.length; i++) {
                    if (bannedUsers[i] === String(user.id)) {
                        //if the user has already been banned from using the bot
                        userIsBanned = 'Yes';
                    }
                }
                for (var i = 0; i < bannedOwners.length; i++) {
                    if (bannedOwners[i] === String(user.id)) {
                        //if the user has already been banned from using the bot
                        ownerIsBanned = 'Yes';
                    }
                }

                var isBot

                if (!user.bot) {
                    isBot = "No"
                } else {
                    isBot = "Yes"
                }

                const Embed = new MessageEmbed()
                    .setColor('#ff3505')
                    .setTitle(`Who is this user`)
                    .setThumbnail(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpeg`)
                    .addFields(
                        { name: 'User\'s Name:', value: user.username, inline: true },
                        { name: 'User\'s ID', value: user.id, inline: true },
                        { name: 'User\'s Tag', value: user.tag },
                        { name: 'User\'s Presence', value: user.presence.status },
                        { name: 'Is the user a bot?', value: isBot },
                        { name: 'User Banned?', value: userIsBanned, inline: true },
                        { name: 'Owner Banned?', value: ownerIsBanned, inline: true })
                    .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
                message.channel.send(Embed)
            });
            } catch(e){
                message.channel.send("The User ID you entered is not valid. Please try again.")
                        }
        } else if(type.toLowerCase() == 'server'){
            message.channel.send("This feature is not enabled yet")
        }
    }
}