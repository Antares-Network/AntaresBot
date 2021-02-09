const messageLog = require("./messageLog")

module.exports = {
    command: async function (guild, message) {
        console.log(`COMMAND`.red, `[${guild.name}]`.green, `[${message.channel.name}]`.blue, `[${message.author.username}]`.yellow, `--`.grey, `${message.content}`.cyan)
        try {
            bot.channels.cache.get(process.env.REPORTING_CHANNEL).send(`**COMMAND** - [${guild.name}] [${message.channel.name}] [${message.author.username}] -- **${message.content}**`)

        } catch (e) {
            console.log(e);
        }
        messageLog.log(message);
    },
    message: function (guild, message) {
        console.log(`MESSAGE`.magenta, `[${guild.name}]`.green, `[${message.channel.name}]`.blue, `[${message.author.username}]`.yellow, `--`.grey, `${message.content}`.cyan)
    },
    dm: function (message) {
        console.log(`DM`.blue, `[${message.author.username}]`.yellow, `--`.grey, `${message.content}`.cyan)
    }
}