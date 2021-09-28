import { MessageActionRow, MessageButton, MessageComponentInteraction, MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck"

export default {
    name: 'invite',
    category: 'User',
    description: 'Sends an invite for the bot and the support server',
    slash: true,
    testOnly: true,
    guildOnly:  true,

    callback: async ({client, message, interaction: msgInt }) => {
        if (await check.check(message, client)) {
        // console.log(`${chalk.red('COMMAND')} [${chalk.green(channel.guild.name)}] [${chalk.blue(channel.name)}] [${chalk.yellow(message.author.username)}] ${chalk.grey('--')} ${chalk.cyan(message.content)}`)
        const Embed = new MessageEmbed()
        .setColor('#ff3505')
        .setTitle("Thank you showing interest in me!")
        .setDescription("If you would like to join our support/community server, click the link below:" +
            "\nhttps://dsc.gg/antaresnetwork")
            .setFooter(`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`);
        
        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setURL('https://dsc.gg/antaresbot')
                    .setLabel('Invite Me!')
                    .setStyle('LINK')
            )
            .addComponents(
                new MessageButton()
                    .setURL('https://dsc.gg/antaresnetwork')
                    .setLabel('Support Server')
                    .setStyle('LINK')
            )
            
            await msgInt.reply({
                content: "Embed Placeholder", //!find a way to put an embed here
                components: [row],
            })
        }
    }
} as ICommand