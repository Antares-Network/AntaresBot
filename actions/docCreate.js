const guildModel = require('../models/guild');
const { MessageEmbed } = require('discord.js');




module.exports = {
    event: async function (guild) {
        var d = new Date();
        const doc = await guildModel.findOne({ GUILD_ID: guild.id }); //find the entry for the guild
        if (doc === null) {
            const internalDoc = new guildModel({
                GUILD_JOIN_DATE: d.toString(),
                GUILD_ICON_URL: guild.iconURL(),
                GUILD_ID: guild.id,
                GUILD_NAME: guild.name,
                GUILD_OWNER_ID: guild.ownerID,
                GUILD_MEMBER_COUNT: guild.memberCount,
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
            .setColor(config.defaultEmbedColor)
            .setTitle(`I joined a new Server`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'Guild Creation Date:', value: guild.createdAt },
                { name: 'Guild Join Date:', value: d.toString() },
                { name: 'Guild Name:', value: guild.name },
                { name: 'Guild ID:', value: guild.id },
                { name: 'Owner ID:', value: guild.ownerID },
                { name: 'Guild Member Count:', value: guild.memberCount })
                .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, config.embedFooterIcon);

        const WelcomeEmbed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle(`Thank you for inviting me to your server`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'My prefix', value: `My current prefix is: **\`&\`** To change my prefix run \`&prefix\`` },
                { name: 'Commands/ help', value: `Please run \`&help\` to see a list of commands` },
                { name: 'Support Server', value: `Join our support server at this link: https://dsc.gg/antaresnetwork` },
                { name: 'Invite me to your server', value: `https://dis.gg/antaresbot` })
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, config.embedFooterIcon);

            bot.users.fetch('603629606154666024', false).then((user) => {
            user.send(Embed);
        });
        try {
            const reporting = bot.channels.cache.get(process.env.REPORTING_CHANNEL)
            reporting.send(Embed);
        } catch (e) {
            console.log(e);
        }

        try {
            const firstChannel = guild.channels.cache.filter(c => c.type === 'text').find(x => x.position == 0);
            firstChannel.send(WelcomeEmbed)
            console.log(`Sent the welcome embed to ${firstChannel.guild.name} in #${firstChannel.name}`)
        } catch (e) {
            //fail silently
        }
    }
}
