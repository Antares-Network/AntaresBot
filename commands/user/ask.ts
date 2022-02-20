import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import { statcord } from "../../index";
import check from "../../functions/channelCheck";

export default {
  name: "ask",
  category: "user",
  description: "Answers all of the questions you might have",
  example: "Ask Am I a dum dum?",
  slash: true,
  guildOnly: true,
  testOnly: false,
  requiredPermissions: ["SEND_MESSAGES"],
  options: [
    {
      name: "question",
      description: "Your burning question",
      required: true,
      type: 3,
    },
  ],

  callback: async ({ client, interaction, args }) => {
    // Command information
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;
    const author = interaction.user;

    // Computed values
    const eightball = [
      "It is certain.",
      "It is decidedly so.",
      "Without a doubt.",
      "Yes definitely.",
      "You may rely on it.",
      "As I see it, yes.",
      "Most likely.",
      "Outlook good.",
      "Yes.",
      "Signs point to yes.",
      "Reply hazy try again.",
      "Ask again later.",
      "Better not tell you now.",
      "Cannot predict now.",
      "Concentrate and ask again.",
      "Don't count on it.",
      "My reply is no.",
      "My sources say no.",
      "Outlook not so good.",
      "Very doubtful.",
      "No way.",
      "Maybe",
      "The answer is hiding inside you",
      "No.",
      "Depends on the mood of the CS god",
      "Hang on",
      "It's over",
      "It's just the beginning",
      "Good Luck",
    ];
    const index = Math.floor(Math.random() * Math.floor(eightball.length));

    // Embed values
    const color = "#ff3505";
    const title = `${author.username} has a burning question`;
    const thumbnail = `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.jpeg`;
    const description = `${author.username} asks:\n ${args[0]}\n\n **My Answer:**\n ${eightball[index]}`;
    const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`;
    const footerIcon = "https://playantares.com/resources/icon.png";

    // Embed construction
    const Embed = new MessageEmbed()
      .setColor(color)
      .setTitle(title)
      .setThumbnail(thumbnail)
      .setDescription(description)
      .setFooter({text: footer, iconURL: footerIcon});

    // Post command usage
    statcord.postCommand("ask", id);

    // Return the embed after the channel is checked
    if (await check.check(interaction, chan)) return Embed;
  },
} as ICommand;