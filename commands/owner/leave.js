const { Command } = require('discord.js-commando');


module.exports = class LeaveCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'leave',
            group: 'owner',
            memberName: 'leave',
            description: 'removes the bot fom a server by id',
            examples: ['leave'],
            guildOnly: true,
            args: [
                {
                    key: 'serverid',
                    prompt: 'Which server do you want the bot to leave?',
                    type: 'string'
                }],
                userPermissions: ['ADMINISTRATOR']
        });
    }

    hasPermission(msg) {
        return this.client.isOwner(msg.author);
    }
    async run(message, { serverid } ) {
        var server = bot.guilds.cache.get(serverid)
        console.log(serverid)
        server.leave()
    }
};