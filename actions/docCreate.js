const guildModel = require('../models/guild');
const { MessageEmbed } = require('discord.js');




module.exports = {
    event: async function (guild, bot) {
        var d = new Date();
        const doc = await guildModel.findOne({ GUILD_ID: guild.id }); //find the entry for the guild
        if (doc === null) {
            const internalDoc = new guildModel({
                GUILD_CREATED_AT: guild.createdAt,
                GUILD_JOIN_DATE: d.toString(),
                GUILD_NAME: guild.name,
                GUILD_ID: guild.id,
                //GUILD_OWNER: guild.owner.user.username,
                GUILD_OWNER_ID: guild.ownerID,
                GUILD_MEMBERS: guild.memberCount,
                GUILD_ICON_URL: guild.iconURL(),
                GUILD_DEFAULT_CHANNEL: null,
                GUILD_MESSAGES: 0
            });
            await internalDoc.save();
        }
        console.log(`I joined a new Server with name:`.blue, `${guild.name}`.green)

        // let channel = guild.channels.cache.find(c => c.type === 'text');
        // let invite = await channel.createInvite({
        //     maxAge: 0, // 0 = infinite expiration
        //     maxUses: 0 // 0 = infinite uses
        // }).catch(console.error);

        const Embed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle(`I joined a new Server`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'Guild Creation Date:', value: guild.createdAt },
                { name: 'Guild Join Date:', value: d.toString() },
                { name: 'Guild Name:', value: guild.name },
                { name: 'Guild ID:', value: guild.id },
                { name: 'Owner ID:', value: guild.ownerID },
                { name: 'Owner Username:', value: guild.owner.user.username},
                { name: 'Guild Member Count:', value: guild.memberCount })
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');

        const WelcomeEmbed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle(`Thank you for inviting me to your server`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'My prefix', value: `My current prefix is: **\`&\`** To change my prefix run \`&prefix\`` },
                { name: 'Commands/ help', value: `Please run \`&help\` to see a list of commands` },
                { name: 'Support Server', value: `Join our support server at this link: https://dsc.gg/antaresnetwork` })
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');



        bot.users.fetch('603629606154666024', false).then((user) => {
            user.send(Embed);
        });
        try {
            bot.channels.cache.get(process.env.REPORTING_CHANNEL).send(Embed);
        } catch (e) {
            console.log(e);
        }

        const firstChannel = guild.channels.cache.filter(c => c.type === 'text').find(x => x.position == 0);
        firstChannel.send(WelcomeEmbed)
    }
}