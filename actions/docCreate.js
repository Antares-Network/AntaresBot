const guildModel = require('../models/guild');
const { MessageEmbed } = require('discord.js');




module.exports = {
    event: async function (guild, bot) {
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
            .setColor('#ff3505')
            .setTitle(`I joined a new Server`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'Guild Creation Date:', value: guild.createdAt },
                { name: 'Guild Join Date:', value: d.toString() },
                { name: 'Guild Name:', value: guild.name },
                { name: 'Guild ID:', value: guild.id },
                { name: 'Owner ID:', value: guild.ownerID },
                { name: 'Guild Member Count:', value: guild.memberCount })
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');


            const WelcomeEmbed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle(`Server Update -- Important message`)
            .setThumbnail('https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png')
            .setDescription("We have just rolled out a **breaking change** to how we handle server data.  This is to better comply with the Discord requirements for bot verification, and a much needed-rewrite. This will mean the bot **will stop functioning** until an admin sets the server's default channel again using the `&defaultchannel #channel` command. This change **will also clear the admin channel**, so an admin will also have to set a new one using the `&adminchannel #channel` command. To see how we store and use server/user data, run `&privacy` If you require further assistance, please join our support server at https://dsc.gg/antaresnetwork Sorry for the inconvenience, and thank you for being the first servers to support Antares Bot. (p.s. All future System Update Messages will be sent in the guild default channel.)\n \n Bot Developer -- Nate")
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
        // const WelcomeEmbed = new MessageEmbed()
        //     .setColor('#ff3505')
        //     .setTitle(`Thank you for inviting me to your server`)
        //     .setThumbnail(guild.iconURL())
        //     .addFields(
        //         { name: 'My prefix', value: `My current prefix is: **\`&\`** To change my prefix run \`&prefix\`` },
        //         { name: 'Commands/ help', value: `Please run \`&help\` to see a list of commands` },
        //         { name: 'Support Server', value: `Join our support server at this link: https://dsc.gg/antaresnetwork` },
        //         { name: 'Invite me to your server', value: `https://dis.gg/antaresbot`})
        //     .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');

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