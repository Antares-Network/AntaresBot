const { Command } = require('discord.js-commando');
const gateModel = require('../../models/gate');


module.exports = class IgnoreCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'ignore',
            group: 'owner',
            memberName: 'ignore',
            description: 'ignores everything from a server',
            examples: ['ignore'],
            guildOnly: true,
            args: [
                {
                    key: 'serverid',
                    prompt: 'Which server do you want the bot to ignore?',
                    type: 'string'
                }],
                userPermissions: ['ADMINISTRATOR']
        });
    }

    hasPermission(msg) {
        return this.client.isOwner(msg.author);
    }

    async run(message, { serverid } ) {
        const gate = await gateModel.findOne({ NAME: 'GATE' })
        var ignoredGuilds = gate.IGNORED_GUILDS
        var server = bot.guilds.cache.get(serverid)
        ignoredGuilds.push(serverid)
        await gateModel.findOneAndUpdate({ NAME: 'GATE' }, { $set: { IGNORED_GUILDS: serverid } }, { new: true })
            .then(
                message.channel.send(`I have been forced to ignore a server by the name \`${server.name}\`, and ID: \`${serverid}\` by<@${message.author.id}>`)
            )
    }
};