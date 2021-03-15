const guildModel = require('../models/guild');
const piiModel = require('../models/pii');




function sendUpdateEmbed(){
    const Embed = new MessageEmbed()
            .setColor('#ff3505')
            .setTitle(`A server has been updated`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'Guild Creation Date:', value: guild.createdAt },
                { name: 'Guild Join Date:', value: d.toString() },
                { name: 'Guild Name:', value: guild.name },
                { name: 'Guild ID:', value: guild.id },
                { name: 'Owner ID:', value: guild.ownerID },
                { name: 'Guild Member Count:', value: guild.memberCount })
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
}



async function checkForUpdates (oldGuild, newGuild) {

    if (oldGuild.name != newGuild.name) {
        await guildModel.findOneAndUpdate({ GUILD_ID: newGuild.id }, { $set: { GUILD_NAME: newGuild.name } }, { new: true });
        await piiModel.findOneAndUpdate({ GUILD_ID: newGuild.id }, { $set: { GUILD_NAME: newGuild.name } }, { new: true });
        return 'name', oldGuild.name, newGuild.name
    } else if (oldGuild.iconURL() != newGuild.iconURL()) {
        return 'iconURL', oldGuild.iconURL(), newGuild.iconURL()
    } else if (oldGuild.region != newGuild.region) {
        return 'region', oldGuild.region, newGuild.region
    } else if (oldGuild.mfaLevel != newGuild.mfaLevel) {
        return 'mfaLevel', oldGuild.mfaLevel, newGuild.mfaLevel
    } else if (oldGuild.explicitContentFilter != newGuild.explicitContentFilter) {
        return 'explicitContentFilter', oldGuild.explicitContentFilter, newGuild.explicitContentFilter
    } else if (oldGuild.available != newGuild.available) {
        return 'available', oldGuild.available, newGuild.available
    }
    //console.log(`GUILD UPDATE`.yellow, `[${oldGuild.name}]`.green, `--->`.grey, `[${newGuild.name}]`.blue)
}

module.exports = {
    update: async function(oldGuild, newGuild){
        var upd = checkForUpdates(oldGuild, newGuild)
        var msg;
        setTimeout(() => {
            if(upd[0] == 'name'){
                msg = `GUILD NAME UPDATE [${oldGuild.name}] ---> [${newGuild.name}]`
            } else if(upd[0] == 'iconURL'){
                msg = `GUILD ICON UPDATE [${oldGuild.iconURL()}] ---> [${newGuild.iconURL()}]`
            } else if(upd[0] == 'region'){
                msg = `GUILD ICON UPDATE [${oldGuild.region}] ---> [${newGuild.region}]`
            } else if(upd[0] == 'mfaLevel'){
                msg = `GUILD ICON UPDATE [${oldGuild.mfaLevel}] ---> [${newGuild.mfaLevel}]`
            } else if(upd[0] == 'explicitContentFilter'){
                msg = `GUILD ICON UPDATE [${oldGuild.explicitContentFilter}] ---> [${newGuild.explicitContentFilter}]`
            } else if(upd[0] == 'available'){
                msg = `GUILD ICON UPDATE [${oldGuild.available}] ---> [${newGuild.available}]`
            }
            bot.channels.cache.get(process.env.REPORTING_CHANNEL).send(msg);
        }, 5000);
        console.log("hahaha")
    }
}