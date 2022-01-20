import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import { statcord } from "../../index";

export default {
  name: "seasonbot",
  category: "user",
  description:
    "Sends an embed with a link to the most recent Season Bot season",
  slash: true,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
    // Command information
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;

    // Embed values
    const color = "#ff3505";
    const url = "https://playantares.com/seasonbot";
    const thumbnail = "https://playantares.com/resources/santa-bot-2020.png";
    const title = "Invite Season Bot today!";
    const fields = [
      { name: "Season Bot", value: "Invite Season Bot today." },
      {
        name: "About",
        value:
          "Cupid Bot (aka Santa Bot) it’s a bot that will bring Valentines day fun to your servers! More than 1,400 servers love it's seasonal themes!",
      },
      {
        name: "Longer Description",
        value:
          "No description has been provided by the Cupid Bot developer yet. Please check back later",
      },
      { name: "Invite Season Bot", value: "https://dsc.gg/seasonbot" },
    ];
    const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`;
    const footerIcon = "https://playantares.com/resources/icon.png";

    // Embed construction
    const Embed = new MessageEmbed()
      .setColor(color)
      .setURL(url)
      .setTitle(title)
      .setThumbnail(thumbnail)
      .setFields(fields)
      .setFooter({text: footer, iconURL: footerIcon});

    // Post command usage
    statcord.postCommand("seasonbot", id);

    // Return the embed after the channel is checked
    if (await check.check(interaction, chan)) return Embed;
  },
} as ICommand;
