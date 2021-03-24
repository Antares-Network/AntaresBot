const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const logToConsole = require('../../actions/logToConsole')

module.exports = class SayCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'poll',
            aliases: ['pollcreate', 'pole'], //!this is a typo on purpose
            group: 'admin',
            memberName: 'poll',
            description: 'Creates a poll',
            examples: ['poll Am I cute'],
            args: [
                {
                    key: 'args',
                    prompt: 'List the args for the poll',
                    type: 'string'
                }
            ],
            guildOnly: true,
            userPermissions: ['ADMINISTRATOR'],
        });
    }

    async run(message, { args }) {
        const defEmojiList = [
            '\u0031\u20E3', //1
            '\u0032\u20E3', //2
            '\u0033\u20E3', //3
            '\u0034\u20E3', //4
            '\u0035\u20E3', //5
            '\u0035\u20E3', //6
            '\u0036\u20E3', //7
            '\u0037\u20E3', //8
            '\u0038\u20E3', //9
            '\u0039\u20E3', //10
            '\uD83D\uDD1F'
        ];
        let opt = args.split(",")

        if (!opt.length == 3) {
            message.reply("You must have 3 options separated by commas.")
            return;
        }
        if (isNaN(parseInt(opt[2]))) { //if the time is a number
            message.reply("You must enter the time for the poll in minutes as an integer.")
            return;
        }


        let options = opt[1].split(" ")
        var description = ""
        for (var i = 0; i < options.length; i++) {
            description += `\n**Option ${i + 1}** - ${options[i]}`
        }
        description += `\n Poll Will run for ${opt[2]} seconds.`

        const Embed = new MessageEmbed()
            .setColor(config.defaultEmbedColor)
            .setTitle(`Poll -- ${opt[0]}`)
            .setDescription(description)
            .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, config.embedFoot);
        var MSG = await message.channel.send(Embed)

        for (var i = 0; i < options.length; i++) {
            await MSG.react(defEmojiList[i])
        }
        setTimeout(async () => {
            const reactions = MSG.reactions.cache;
            var largest = [defEmojiList[1], 1]
            for (var i = 0; i < options.length; i++) {
                var num = reactions.get(defEmojiList[i]).count
                if (largest[1] < num) {
                    largest[0] = defEmojiList[i]
                    largest[1] = num
                }
            }
            const EndEmbed = new MessageEmbed()
                .setColor('#0BDC21') //green
                .setTitle(`Poll -- ${opt[0]}`)
                .setDescription(`${options[defEmojiList.indexOf(largest[0])]} -- Has won with ${largest[1]} votes`)
                .setFooter(`Delivered in: ${bot.ws.ping}ms | Antares Bot | ${botVersion}`, config.embedFooterIcon);
            MSG.edit(EndEmbed)
        }, opt[2] * 1000);
    }
};


