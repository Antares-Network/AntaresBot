import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import { statcord } from "../../index";

export default {
  name: "invite",
  category: "user",
  description: "Sends an invite for the bot and the support server",
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
    // Command information
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;

    // Embed values
    const color = "#ff3505";
    const url = "https://dsc.gg/antaresnetwork";
    const thumbnail = "https://playantares.com/resources/icon.png";
    const title = "Invite";
    const channelDescription =
      "If you would like to invite Antares Bot to your server, click the link below:" +
      "\n[Join our support server](https://discord.com/oauth2/authorize?client_id=736086156759924762&permissions=388177&scope=bot%20applications.commands)";
    const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`;
    const footerIcon = "https://playantares.com/resources/icon.png";

    // Embed construction
    const ChannelEmbed = new MessageEmbed()
      .setColor(color)
      .setURL(url)
      .setTitle(title)
      .setThumbnail(thumbnail)
      .setDescription(channelDescription)
      .setFooter(footer, footerIcon);

    // Post command usage
    statcord.postCommand("invite", id);

    // Return the embed after the channel is checked
    if (await check.check(interaction, chan)) {
      interaction.reply({ embeds: [ChannelEmbed] });
    }
  },
} as ICommand;
