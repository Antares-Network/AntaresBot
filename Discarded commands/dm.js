// const { Message } = require('discord.js');
// const { Command } = require('discord.js-commando');
// const logToConsole = require('../actions/logToConsole')


// module.exports = class DmCommand extends Command {
//     constructor(client) {
//         super(client, {
//             name: 'dm',
//             group: 'admin',
//             memberName: 'dm',
//             description: 'Sends a message to the user you mention.',
//             examples: ['dm @User Hi there!'],
//             args: [
//                 {
//                     key: 'user',
//                     prompt: 'Which user do you want to send the DM to?',
//                     type: 'user'
//                 },
//                 {
//                     key: 'content',
//                     prompt: 'What would you like the content of the message to be?',
//                     type: 'string'
//                 }
//             ],
//             throttling: {
//                 usages: 1,
//                 duration: 3600,
//             },
//             guildOnly: true,
//             userPermissions: ['ADMINISTRATOR']
//         });
//     }

//     run(message, { user, content }) {
//         message.delete();
//         bot.users.cache.get(user.id).send(content);
//         logToConsole.command(message.guild, message);
//     }
// };