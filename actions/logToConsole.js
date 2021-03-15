const messageLog = require("./messageLog")

module.exports = {
    command: async function (guild, message) {
        console.log(`COMMAND`.red, `[${guild.name}]`.green, `[${message.channel.name}]`.blue, `[${message.author.username}]`.yellow, `--`.grey, `${message.content}`.cyan)
        //messageLog.log(message);
    },

    message: function (guild, message) {
      var str = message.content.replace(/[^\x00-\x7F]/g, "");
      console.log(str)
      console.log(`MESSAGE`.magenta, `[${guild.name}]`.green, `[${message.channel.name}]`.blue, `[${message.author.username}]`.yellow, `--`.grey, `${str}`.cyan)
    },

    dm: function (message) {
        console.log(`DM`.blue, `[${message.author.username}]`.yellow, `--`.grey, `${message.content}`.cyan)
    },

    memberJoin: async function (member) {
		console.log(`MEMBER JOIN`.blue, `[${member.guild.name}]`.green, `[${member.user.username}]`.yellow)
    },

    memberLeave: async function (member) {
		console.log(`MEMBER LEAVE`.blue, `[${member.guild.name}]`.green, `[${member.user.username}]`.yellow)
    }
}