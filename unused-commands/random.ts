// import { MessageEmbed } from 'discord.js';
// import { ICommand } from "wokcommands";
// import { api } from "random-stuff-api";

// export default {
//     category: 'User',
//     description: 'Sends a random *thing*. Send *random* for more details',
//     example: 'random joke',
//     args: [
//         {
//             key: 'text',
//             prompt: 'lalallala',
//             type: 'string',
//             default: ''
//         }
//     ],
//     minArgs: 0,
//     maxArgs: 1,
//     slash: false,
//     guildOnly: true,

//     callback: ({ client, channel, args }) => {
//         //message.delete()
//             //message.channel.send("This command is currently disabled as it is being rewritten")
//             switch (args[0].toUpperCase()) {
//                 case 'JOKE':
//                     api.random.joke()
//                         .then(result => {
//                             channel.send(result)
//                         })


//                     return;
//                 case 'CN':
//                     api.random.cnjoke()
//                         .then(result => {
//                             channel.send(result)
//                         })


//                     return;
//                 case 'DEVJOKE':
//                     api.random.devjoke()
//                         .then(result => {
//                             channel.send(result)
//                         })

//                     return;
//                 case 'INSULT':
//                     api.random.insult()
//                         .then(result => {
//                             channel.send(result)
//                         })
//                     return;
//                 case 'AWW':
//                     api.image.aww()
//                         .then(result => {
//                             channel.send(result)
//                         })
//                     return;
//                 case 'FACEPALM':
//                     api.image.facepalm()
//                         .then(result => {
//                             channel.send(result)
//                         })

//                     return;
//                 case 'WHOLESOME':
//                     api.image.wholesome()
//                         .then(result => {
//                             channel.send(result)
//                         })

//                     return;
//                 case 'DANKMEME':
//                     api.image.dankmeme()
//                         .then(result => {
//                             channel.send(result)
//                         })

//                     return;

//                 case 'ART':
//                     api.image.art()
//                         .then(result => {
//                             channel.send(result)
//                         })

//                     return;
//                 case 'DEADINSIDE':
//                     api.image.deadinside()
//                         .then(result => {
//                             channel.send(result)
//                         })

//             }
//             if (!args[0]) {
//                 const Embed = new MessageEmbed()
//                     .setColor('#ff3505')
//                     //.setURL('https://discord.gg/6pZ2wtGANP')
//                     .setTitle("A list of commands that return random things")
//                     .setDescription("**random `joke`**: returns a dad joke" +
//                         "\n\n **random `cn`**: returns a Chuck Norris Joke" +
//                         "\n\n **random `devjoke`**: returns a dev joke" +
//                         "\n\n **random `insult`**: returns a random insult" +
//                         "\n\n **random `aww`**: returns a cute moment" +
//                         "\n\n **random `facepalm`**: returns a facepalm moment" +
//                         "\n\n **random `wholesome`**: returns a wholesome meme" +
//                         "\n\n **random `dankmeme`**: returns a dank meme :o" +
//                         "\n\n **random `deadinside`**: returns a 'Watch people die inside' moment" +
//                         "\n\n **random `art`**: returns cool art pic")
//                     .setFooter(`Delivered in: ${this.client.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
//                 channel.send(Embed);
//                 }
//         };
// } as ICommand