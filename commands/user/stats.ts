import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import gateModel from "../../models/gate";
import check from "../../functions/channelCheck";
import { statcord } from "../../index";

export default {
  name: "stats",
  category: "user",
  description: "Sends an embed with some fun bot stats",
  slash: true,
  testOnly: true,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;
    const author = interaction.user;

    const doc = await gateModel.findOne({ NAME: "GATE" });
    const Embed = new MessageEmbed()
      .setColor("#ff3505")
      .setTitle("Fun Bot Stats!")
      .setThumbnail("https://playantares.com/resources/icon.png")
      .addFields([
        {
          name: "This guild's Member Count:",
          value: interaction.guild?.memberCount.toString(),
        },
        { name: "Total Bot users:", value: doc.TOTAL_USERS },
        { name: "Total servers the bot is in:", value: doc.TOTAL_SERVERS },
        {
          name: "Total messages everyone has sent to the bot:",
          value: doc.TOTAL_MESSAGES,
        },
        { name: "Last update time:", value: doc.UPDATE_TIME },
      ])
      .setDescription(
        `Remember to run \`${process.env.BOT_DEFAULT_PREFIX}update\` before this to make sure the Database is up to date` +
          `\n Check out our [Stats Page](https://playantares.com/antaresbot/stats)`
      )
      .setFooter(
        `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
        "https://playantares.com/resources/icon.png"
      );
    if (await check.check(interaction, chan, author, client)) {
      interaction.reply({ embeds: [Embed] });
      // Post command usage
      statcord.postCommand("stats", id);
    }
  },
} as ICommand;
