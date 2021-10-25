import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import statcord from "../../index"

export default {
  name: "invite",
  category: "user",
  description: "Sends an invite for the bot and the support server",
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, message }) => {
    if (await check.check(message, client)) {
      statcord.statcord.postCommand("invite", message.author.id);
      const Embed = new MessageEmbed()
        .setColor("#ff3505")
        .setTitle("Thank you showing interest in me!")
        .setDescription(
          "If you would like to join our support/community server, click the link below:" +
            "\n[Join our support server](https://discord.com/oauth2/authorize?client_id=736086156759924762&permissions=388177&scope=bot%20applications.commands)"
        )
        .setFooter(
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );

      const Embed2 = new MessageEmbed()
        .setColor("#ff3505")
        .setTitle("Invite Antares Bot to Your Server")
        .setDescription(
          "If you would like to invite Antares Bot to your server, click the link below:" +
            "\n[Invite Me!](https://dsc.gg/antaresbot)"
        )
        .setFooter(
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );

      message.author.send({ embeds: [Embed] });
      return Embed2;
    }
  },
} as ICommand;
