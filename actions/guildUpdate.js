const guildModel = require('../models/guild');
const piiModel = require('../models/pii');

module.exports = {
    update: async function (oldGuild, newGuild) {
        var msg;

        if (oldGuild.name != newGuild.name) {
            await guildModel.findOneAndUpdate({ GUILD_ID: newGuild.id }, { $set: { GUILD_NAME: newGuild.name } }, { new: true });
            await piiModel.findOneAndUpdate({ GUILD_ID: newGuild.id }, { $set: { GUILD_NAME: newGuild.name } }, { new: true });
            msg = `GUILD NAME UPDATE [${oldGuild.name}] ---> [${newGuild.name}]`
        } else if (oldGuild.iconURL() != newGuild.iconURL()) {
            await guildModel.findOneAndUpdate({ GUILD_ID: newGuild.id }, { $set: { GUILD_ICON_URL: newGuild.iconURL() } }, { new: true });
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