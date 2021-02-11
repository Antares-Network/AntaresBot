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
    },

    memberJoin: async function (member) {
		console.log(`MEMBER JOIN`.blue, `[${member.guild.name}]`.green, `[${member.user.username}]`.yellow)
    },

    memberLeave: async function (member) {
		console.log(`MEMBER LEAVE`.blue, `[${member.guild.name}]`.green, `[${member.user.username}]`.yellow)
    },

    guildUpdate: async function (oldGuild, newGuild) {
        console.log(`GUILD UPDATE`.yellow, `[${oldGuild.name}]`.green, `--->`.grey, `[${newGuild.name}]`.blue)
        try {
            bot.channels.cache.get(process.env.REPORTING_CHANNEL).send(`**GUILD UPDATE** - [${oldGuild.name}]  --->  [${newGuild.name}]`)
        } catch (e) {
            console.log(e);
        }
    }
}