import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import gateModel from "../../models/gate";
import guildModel from "../../models/guild";
import check from "../../functions/channelCheck";
import { statcord } from "../../index";

export default {
  name: "update",
  category: "user",
  description: "Updates stats of the bot",
  slash: true,
  guildOnly: true,
  testOnly: false,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;

    const gate = await gateModel.findOne({ NAME: "GATE" });
    const preEmbed = new MessageEmbed()
      .setColor("#ff3505")
      .setTitle("Updating database")
      .setDescription(`Please wait up to 10 seconds`)
      .setFooter({text:
      `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
      "https://playantares.com/resources/icon.png"
    });
    const postEmbed = new MessageEmbed()
      .setColor("#ff3505")
      .setTitle("Database Updated")
      .setDescription(
        `Database has been successfully updated\n Run \`/stats\` to see the updated server stats`
      )
      .setFooter({text:
      `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
      "https://playantares.com/resources/icon.png"
    });
    if (await check.check(interaction, chan)) {
      interaction.reply({ embeds: [preEmbed] });
      //var init and gc
      let totalUsers = 0;
      let totalMessages = 0;
      const totalOwners: Array<string> = [];
      //get data from all the guilds
      client.guilds.cache.forEach(async (guild) => {
        const doc = await guildModel.findOne({ GUILD_ID: guild.id });
        totalMessages += Number(doc.GUILD_MESSAGES);
        totalOwners.push(guild.ownerId);
        totalUsers += guild.memberCount;
      });

      setTimeout(async () => {
        const d = new Date();
        await gateModel.findOneAndUpdate(
          { NAME: "GATE" },
          {
            $set: {
              GUILD_OWNER_ID: totalOwners,
              TOTAL_MESSAGES: totalMessages,
              TOTAL_SERVERS: (await client.guilds.fetch()).size,
              TOTAL_USERS: totalUsers,
              UPDATE_TIME: d.toString(),
            },
          },
          { new: true }
        );
        interaction.editReply({ embeds: [postEmbed] });
      }, 2000);
      // Post command usage
      statcord.postCommand("update", id);
    }
  },
} as ICommand;
