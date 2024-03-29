import {
  MessageEmbed,
  Interaction,
  MessageComponentInteraction,
  MessageActionRow,
  MessageButton,
} from "discord.js";
import { ICommand } from "wokcommands";
import { statcord } from "../../index";

export default {
  name: "help",
  category: "user",
  description: "Shows the help embed",
  slash: true,
  testOnly: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, channel, interaction: msgInt, instance }) => {
    const id = msgInt.user.id;
    statcord.postCommand("help", id);
    const helpEmbed = new MessageEmbed()
      .setTitle("Antares Bot Help and Commands")
      .setColor("#ff3505")
      .setThumbnail("https://antaresnetwork.com/resources/icon.png")
      .setDescription(
        "Welcome to Antares Bot! Here you can find all the commands you need!\n **ALL COMMANDS ARE NOW SLASH COMMANDS**\n Learn how slash commands work [here](https://support.discord.com/hc/en-us/articles/1500000368501-Slash-Commands-FAQ)."
      )
      .addFields([
        {
          name: "Current Server prefix:",
          value: instance.getPrefix(msgInt.guild),
          inline: true,
        },
        {
          name: "Command Categories",
          value:
            "📸**Random Images**\n\n🎲**Chance Games**\n\n🕹️**Skill Games**\n\n📺**Trivia/Facts**\n\n📈**Utility**",
        },
        {
          name: "Invite Me",
          value:
            "[Click to add me to your server!](https://discord.com/oauth2/authorize?client_id=736086156759924762&permissions=388177&scope=bot%20applications.commands)",
        },
        {
          name: "Support Server",
          value:
            "[Click to join the support server!](https://antaresnetwork.com/discord)",
        },
        {
          name: "Invite SeasonBot",
          value:
            "[Click to invite SeasonBot to your server!](https://discord.com/oauth2/authorize?client_id=774520746344054824&scope=bot&permissions=126032)",
        },
      ])
      .setFooter({text:
        `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
        "https://antaresnetwork.com/resources/icon.png"
      });
    const imagesEmbed = new MessageEmbed()
      .setTitle("Random Image Commands")
      .setColor("#ff3505")
      .setDescription(
        `**cat**: Gets a random cat image` +
          `\n**dog**: Gets a random dog image` +
          `\n**fox**: Gets a random fox image` +
          `\n**duck**: Gets a random duck image` +
          `\n**comic**: Gets a random XKCD comic` +
          `\n**More coming soon**`
      )
      .setFooter({text:
        `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
        "https://antaresnetwork.com/resources/icon.png"
      });
    const chanceEmbed = new MessageEmbed()
      .setTitle("Chance Games Commands")
      .setColor("#ff3505")
      .setDescription(
        `**flip**: Flips a coin. Heads or Tails` +
          `\n**roll**: Rolls a Die` +
          `\n**ask** \`<questionHere>\`: Asks the Magic 8 Ball your question` +
          `\n**More coming soon**`
      )
      .setFooter({text:
        `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
        "https://antaresnetwork.com/resources/icon.png"
      });
    const skillEmbed = new MessageEmbed()
      .setTitle("Skill Games Commands")
      .setColor("#ff3505")
      .setDescription(
        `**rps**: Rock, Paper, Scissors` +
          `\n**tictactoe** <@SOMEUSER>: Play Tic Tac Toe with your friend` +
          `\n**More coming soon**`
      )
      .setFooter({text:
      `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
      "https://antaresnetwork.com/resources/icon.png"
    });
    const triviaEmbed = new MessageEmbed()
      .setTitle("Trivia/Facts Commands")
      .setColor("#ff3505")
      .setDescription(
        `**trivia**: Sends a multiple choice trivia question. (Categories coming soon)` +
          `\n**fact**: Sends a random fact (Coming Soon)` +
          "\n**jeopardy**: Sends a random jeopardy question. (Categories coming soon)" +
          `\n**More coming soon**`
      )
      .setFooter({text:
      `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
      "https://antaresnetwork.com/resources/icon.png"
    });
    const utilityEmbed = new MessageEmbed()
      .setTitle("Utility/Misc Commands")
      .setColor("#ff3505")
      .setDescription(
        `**ping**: Sends the ping time of the bot` +
          `\n**r**: Does something` +
          `\n**seasonbot**: Sends an embed telling you all about our partner bot SeasonBot` +
          `\n**sneeze**: Makes the bot sneeze` +
          `\n**invite**: Sends an invite link to add me to your server` +
          `\n**prefix**: Changes the server prefix` +
          `\n**help**: Shows this help embed` +
          `\n**uptime**: Shows the bot\'s uptime` +
          `\n**version**: Shows the bot\'s version number` +
          `\n**update**: Updates the bot\'s stats embed` +
          `\n**stats**: Shows the bot\'s stats embed` +
          `\n**adminhelp**: Shows the admin command help embed` +
          `\n**github**: Shows the github link for the bot` +
          `\n**privacy**: Sends the bot\'s Privacy policy in DM\'s` +
          `\n**remove**: Request deletion of your data from our servers` +
          `\n**More coming soon**`
      )
      .setFooter({text:
      `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
      "https://antaresnetwork.com/resources/icon.png"
    });
      const soonEmbed = new MessageEmbed()
        .setTitle("Planned features")
        .setColor("#ff3505")
        .setDescription(
            `**reddit**: Get memes from reddit` +
            `\n**confess**: Confess something anonymous to your server` +
            `\n**tictactoe**: Play tic tac toe with your friends` +
            `\n**SOTD**: Auto Post a song of the day of the bot's choosing. Can also play it in your voice or stage channel` +
            `\n**Custom server welcome messages**` +
            `\n**Custom server leave messages**` +
            `\n**New features for counting (drops, prizes, powerups, etc)**` +
            `\n**Even more in the works**`
            )
      .setFooter({text:
      `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
      "https://antaresnetwork.com/resources/icon.png"
    });
    const row = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId("images")
          .setEmoji("📸")
          .setLabel("Random Images")
          .setStyle("SUCCESS")
      )
      .addComponents(
        new MessageButton()
          .setCustomId("chance")
          .setEmoji("🎲")
          .setLabel("Chance Games")
          .setStyle("SUCCESS")
      )
      .addComponents(
        new MessageButton()
          .setCustomId("skills")
          .setEmoji("🕹️")
          .setLabel("Skill Games")
          .setStyle("SUCCESS")
          .setDisabled(true)
      )
      .addComponents(
        new MessageButton()
          .setCustomId("soon")
          .setEmoji("™️")
          .setLabel("Coming Soon(TM)")
          .setStyle("DANGER")
      )
      .addComponents(
        new MessageButton()
          .setCustomId("utility")
          .setEmoji("📈")
          .setLabel("Utility/Misc")
          .setStyle("DANGER")
      );

    msgInt.reply({ embeds: [helpEmbed], components: [row] });
    const filter = (btnInt: Interaction) => {
      return true;
    };
    const collector = channel.createMessageComponentCollector({
      filter,
    });
    collector.on("collect", (i: MessageComponentInteraction) => {
      if (i.customId === "images") {
        i.reply({ embeds: [imagesEmbed], ephemeral: true  })
      } else if (i.customId === "chance") {
        i.reply({ embeds: [chanceEmbed], ephemeral: true  })
      } else if (i.customId === "skills") {
        i.reply({ embeds: [skillEmbed], ephemeral: true });
      } else if (i.customId === "soon") {
        i.reply({ embeds: [soonEmbed], ephemeral: true  });
      } else if (i.customId === "utility") {
        i.reply({ embeds: [utilityEmbed], ephemeral: true });
      }
    });
    // Post command usage
    statcord.postCommand("help", id);
  },
} as ICommand;
