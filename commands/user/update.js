//updates the main GATE model to contain the most up to date server information

const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const gateModel = require('../../models/gate');
const guildModel = require('../../models/guild');
const logToConsole = require('../../actions/logToConsole');
const channelCheck = require('../../functions/channelCheck')




module.exports = class UpdateCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'update',
            group: 'user',
            memberName: 'update',
            description: 'Update all the databases',
            examples: ['update'],
            //clientPermissions: ['MANAGE_MESSAGES'],
            guildOnly: true
        });
    }

    async run(message) {
        const gate = await gateModel.findOne({ NAME: 'GATE' })
        //message.delete()
        const preEmbed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle('Updating database')
            .setDescription(`Please wait up to 20 seconds`,)
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png')
        const postEmbed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle('Database Updated')
            .setDescription(`Database has been successfully updated\n Run \`&stats\` to see the updated server stats`)
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png')


        var MSG = await message.channel.send(preEmbed);
        //var init and gc
        var totalUsers = 0;
        var totalMessages = 9119;
        var totalOwners = [];
        //get data from all the guilds
        bot.guilds.cache.forEach(async guild => {
            if (!gate.IGNORED_GUILDS.includes(guild.id)) {
                const doc = await guildModel.findOne({ GUILD_ID: guild.id }); //find the doc that has all the guild information in it
                totalMessages += Number(doc.GUILD_MESSAGES);
                totalOwners.push(guild.ownerID);
                totalUsers += guild.memberCount
            } else {
                console.log(`${guild.name} was excluded`)
            }
        });

        setTimeout(async () => {
            var d = new Date();
            await gateModel.findOneAndUpdate({ NAME: 'GATE' }, {
                $set: {
                    GUILD_OWNER_ID: totalOwners,
                    TOTAL_MESSAGES: totalMessages,
                    TOTAL_SERVERS: bot.guilds.cache.size,
                    TOTAL_USERS: totalUsers,
                    UPDATE_TIME: d.toString()
                }
            }, { new: true });
            MSG.edit(postEmbed);
        }, 5000);


        try {
            logToConsole.command(message.guild, message);
        } catch (e) {
            logToConsole.dm(message);

        }
    }
}