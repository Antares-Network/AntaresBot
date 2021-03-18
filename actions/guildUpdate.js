const guildModel = require('../models/guild');
const piiModel = require('../models/pii');

async function checkForUpdates(oldGuild, newGuild) {

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
    update: async function (oldGuild, newGuild) {
        var msg;

        if (oldGuild.name != newGuild.name) {
            await guildModel.findOneAndUpdate({ GUILD_ID: newGuild.id }, { $set: { GUILD_NAME: newGuild.name } }, { new: true });
            await piiModel.findOneAndUpdate({ GUILD_ID: newGuild.id }, { $set: { GUILD_NAME: newGuild.name } }, { new: true });
            msg = `GUILD NAME UPDATE [${oldGuild.name}] ---> [${newGuild.name}]`
        } else if (oldGuild.iconURL() != newGuild.iconURL()) {
            msg = `GUILD ICON UPDATE [${newGuild.name}] [${oldGuild.iconURL()}] ---> [${newGuild.iconURL()}]`
        } else if (oldGuild.region != newGuild.region) {
            msg = `GUILD REGION UPDATE [${newGuild.name}] [${oldGuild.region}] ---> [${newGuild.region}]`
        } else if (oldGuild.mfaLevel != newGuild.mfaLevel) {
            msg = `GUILD MFA LEVEL UPDATE [${newGuild.name}] [${oldGuild.mfaLevel}] ---> [${newGuild.mfaLevel}]`
        } else if (oldGuild.explicitContentFilter != newGuild.explicitContentFilter) {
            msg = `GUILD EXPLICIT CONTENT FILTER UPDATE [${newGuild.name}] [${oldGuild.explicitContentFilter}] ---> [${newGuild.explicitContentFilter}]`
        } else if (oldGuild.available != newGuild.available) {
            msg = `GUILD AVAILABILITY UPDATE [${newGuild.name}] [${oldGuild.available}] ---> [${newGuild.available}]`
        }

        bot.channels.cache.get(process.env.REPORTING_CHANNEL).send(msg);
        console.log(msg)
    }
}