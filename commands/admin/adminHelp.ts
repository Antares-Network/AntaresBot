import { MessageEmbed, Interaction, MessageComponentInteraction, MessageActionRow, MessageButton } from "discord.js";
import { ICommand } from "wokcommands";
import adminChanCheck from "../../functions/adminChanCheck";

export default {
  category: "admin",
  description: "Shows the bot's admin help embed",
  aliases: ["ahelp", "aHelp"],
  guildOnly: true,
  requiredPermissions: ["MANAGE_GUILD"],

  callback: async ({ client, channel, message }) => {
    if (await adminChanCheck.check(message, client)) {
      const helpEmbed = new MessageEmbed()
        .setColor("#ff3505")
        .setURL("https://discord.gg/KKYw763")
        .setTitle("Admin Help")
        .addFields([
            { name: "About", value: "Here you will find all the commands to control Antares Bot in your server" },
            { name: "Command Categories", value: "⚙️**Bot Config**\n\n🔢**Counting Config**"},
            { name: "Invite Me", value: "[Click to add me to your server!](https://discord.com/oauth2/authorize?client_id=736086156759924762&permissions=388177&scope=bot%20applications.commands)"},
            { name: "Support Server", value: "[Click to join the support server!](https://discord.gg/KKYw763)"},
            { name: "Invite SeasonBot", value: "[Click to invite SeasonBot to your server!](https://discord.com/oauth2/authorize?client_id=774520746344054824&scope=bot&permissions=126032)"},
        ])
        .setFooter(
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );
        const configEmbed = new MessageEmbed()
        .setTitle("Bot Config commands")
        .setColor("#ff3505")
        .setDescription(`**admin**: Sets the server's admin channel` +
            `\n**setup <#Mentioned channel>**: Sets the channel the bot will talk in for regular commands` +
            `\n**adminHelp**: Shows the main admin help embed` +
            `\n**remove**: Provides info about how to remove all your personal data from the bot's database` +
            `\n**say <#Mentioned channel>**: Makes the bot say something. If a channel is mentioned, it will say what you want in that channel.` +
            `\n**command <enable / disable> commandName**: Enables or Disables a command server-wide` +
            `\n**requiredRole <Command name> <"none" or Role ID>**: Allows you to require roles for a command to be run.` +
            `\n**prefix <New prefix>**: Sets a new prefix for the server` +
            `\n**More coming soon**`)
        .setFooter(
            `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
            "https://playantares.com/resources/icon.png"
          );
        const countingEmbed = new MessageEmbed()
            .setTitle("Counting Config")
            .setColor("#ff3505")
            .setDescription(`**counting**: Creates a channel called Counting in your server. Also sends an embed with the rules of the game` +
            `\n**countingNumber** <some number>: Can set your counting channel to a previously counted to number. Useful if the bot goes offline and your server counts while it cant keep track.` +
            `\n**More coming soon**`)
            .setFooter(
                `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
                "https://playantares.com/resources/icon.png"
              );
        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                .setCustomId("config")
                .setEmoji("⚙️")
                .setLabel("Config Commands")
                .setStyle("SUCCESS")
            )
            .addComponents(
                new MessageButton()
                    .setCustomId("counting")
                    .setEmoji("🔢")
                    .setLabel("Counting Commands/Setup")
                    .setStyle("SUCCESS")
            )
        channel.send({embeds: [helpEmbed], components: [row]})

        const filter = (btnInt: Interaction) => {
            return btnInt.user.id == message.author.id;
        }

        const collector = channel.createMessageComponentCollector({
            filter,
        })

        collector.on("collect", (i: MessageComponentInteraction) => {
                if (i.customId === "config") {
                    i.reply({embeds: [configEmbed]}).then(() => {
                        setTimeout(() => {
                            i.deleteReply()
                        }, 1000 * 30)
                    })
                } else if (i.customId === "counting") {
                    i.reply({embeds: [countingEmbed]}).then(() => {
                        setTimeout(() => {
                            i.deleteReply()
                        }, 1000 * 30)
                    })
                }
            })

        collector.on("end", (collected) => {
            console.log(collected)
        })
    }
  },
} as ICommand;