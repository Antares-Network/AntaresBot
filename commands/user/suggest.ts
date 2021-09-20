// import { MessageEmbed } from 'discord.js';
// import { ICommand } from "wokcommands";


// export default {
//     category: 'User',
//     description: 'Suggest a new bot feature',
//     slash: 'both',
//     testOnly: true,
//     expectedArgs: '<suggestion>',
//     minArgs: 1,
//     maxArgs: 1,

//     callback: ({ client, message, args }) => {
//         const Embed = new MessageEmbed()
//             .setColor('#ff3505')
//             //.setURL('https://dsc.gg/antaresnetwork')
//             .setTitle('New Bot Suggestion')
//             .setThumbnail(`https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.jpeg`)
//             .setDescription(`<@${message.author.id}> in the server **${message.guild.name}** suggests:\\n ${args[0]}`,)
//             .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, 'https://playantares.com/resources/icon.png');
//             client.users.fetch('603629606154666024', false).then((user) => {
//                 user.send(Embed);
//             message.channel.send(`Thank you for your suggestion. It has been received.`)
//         return Embed;

//     }
// } as ICommand







// const Embed = new MessageEmbed()
// .setColor(config.defaultEmbedColor)
//     //.setURL('https://dsc.gg/antaresnetwork')
//     .setTitle('New Bot Suggestion')
//     .setThumbnail(`https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.jpeg`)
//     .setDescription(`<@${message.author.id}> in the server **${message.guild.name}** suggests:\\n ${text}`,)
//     .setFooter(`Delivered in: ${this.client.ws.ping}ms | Antares Bot | ${botVersion}`, config.embedFooterIcon);


    
// });