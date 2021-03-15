const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const api = require('random-stuff-api');
const channelCheck = require('../../functions/channelCheck')
const logToConsole = require('../../actions/logToConsole')


module.exports = class RandomCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'random',
            group: 'user',
            memberName: 'random',
            description: 'Sends a random *thing*. Send *random* for more details',
            examples: ['random joke'],
            args: [
                {
                    key: 'text',
                    prompt: 'lalallala',
                    type: 'string',
                    default: ''
                }
            ],
            //clientPermissions: ['MANAGE_MESSAGES'],
            guildOnly: true
        });
    }

    async run(message, { text }) {
        //message.delete()
        if (await channelCheck.check(message) == true) {
            //message.channel.send("This command is currently disabled as it is being rewritten")
            switch (text.toUpperCase()) {
                case 'JOKE':
                    api.random.joke()
                        .then(result => {
                            message.channel.send(result)
                        })
                    logToConsole.command(message.guild, message);

                    return;
                case 'CN':
                    api.random.cnjoke()
                        .then(result => {
                            message.channel.send(result)
                        })
                    logToConsole.command(message.guild, message);

                    return;
                case 'DEVJOKE':
                    api.random.devjoke()
                        .then(result => {
                            message.channel.send(result)
                        })
                    logToConsole.command(message.guild, message);

                    return;
                case 'INSULT':
                    api.random.insult()
                        .then(result => {
                            message.channel.send(result)
                        })
                    logToConsole.command(message.guild, message);
                    return;
                case 'AWW':
                    api.image.aww()
                        .then(result => {
                            message.channel.send(result)
                        })
                    logToConsole.command(message.guild, message);

                    return;
                case 'FACEPALM':
                    api.image.facepalm()
                        .then(result => {
                            message.channel.send(result)
                        })
                    logToConsole.command(message.guild, message);

                    return;
                case 'WHOLESOME':
                    api.image.wholesome()
                        .then(result => {
                            message.channel.send(result)
                        })
                    logToConsole.command(message.guild, message);

                    return;
                case 'DANKMEME':
                    api.image.dankmeme()
                        .then(result => {
                            message.channel.send(result)
                        })
                    logToConsole.command(message.guild, message);

                    return;

                case 'ART':
                    api.image.art()
                        .then(result => {
                            message.channel.send(result)
                        })
                    logToConsole.command(message.guild, message);

                    return;
                case 'DEADINSIDE':
                    api.image.deadinside()
                        .then(result => {
                            message.channel.send(result)
                        })
                    logToConsole.command(message.guild, message);

            }
            if (!text) {
                console.log(text)
                const Embed = new MessageEmbed()
                    .setColor('#ff3505')
                    //.setURL('https://discord.gg/6pZ2wtGANP')
                    .setTitle("A list of commands that return random things")
                    .setDescription("**random `joke`**: returns a dad joke" +
                        "\n\n **random `cn`**: returns a Chuck Norris Joke" +
                        "\n\n **random `devjoke`**: returns a dev joke" +
                        // "\n\n **random `insult`**: ❗Disabled to improve nsfw filtering" +
                        // "\n\n **random `aww`**: ❗Disabled to improve nsfw filtering" +
                        // "\n\n **random `facepalm`**: ❗Disabled to improve nsfw filtering" +
                        // "\n\n **random `wholesome`**: ❗Disabled to improve nsfw filtering" +
                        // "\n\n **random `dankmeme`**: ❗Disabled to improve nsfw filtering" +
                        // "\n\n **random `deadinside`**: ❗Disabled to improve nsfw filtering" +
                        // "\n\n **random `art`**: ❗Disabled to improve nsfw filtering")
                        "\n\n **random `insult`**: returns a random insult" +
                        "\n\n **random `aww`**: returns a cute moment" +
                        "\n\n **random `facepalm`**: returns a facepalm moment" +
                        "\n\n **random `wholesome`**: returns a wholesome meme" +
                        "\n\n **random `dankmeme`**: returns a dank meme :o" +
                        "\n\n **random `deadinside`**: returns a 'Watch people die inside' moment" +
                        "\n\n **random `art`**: returns cool art pic")
                    .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, 'https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png');
                message.channel.send(Embed);

                //send to the console that this command was run
                logToConsole.command(message.guild, message);
            }
        }
    };
}