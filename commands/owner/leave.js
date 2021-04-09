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
        var server = this.client.guilds.cache.get(serverid)
        message.channel.send(`I have been forced to leave a server by the name \`${server.name}\`, and ID: \`${serverid}\` by<@${message.author.id}>`)
        server.leave()
    }
};