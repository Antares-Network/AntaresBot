import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";
import gateModel from "../../models/gate";
import piiModel from "../../models/pii";

export default {
  category: "owner",
  description: "Sends a message about a user or a guild specified by ID",
  slash: false,
  expectedArgs: "<type> <ID>",
  minArgs: 2,
  maxArgs: 2,
  ownerOnly: true,
  hidden: true,

  callback: async ({ client, args, channel }) => {
    const type = args[0];
    const id = args[1];

    if (type.toLowerCase() == "user") {
      try {
        client.users.fetch(String(id)).then(async (user) => {
          const gate = await gateModel.findOne({ NAME: "GATE" }); //find the entry for the guild
          let bannedUsers = gate.BANNED_USERS;
          let userIsBanned = "No";
          let bannedOwners = gate.BANNED_OWNERS;
          let ownerIsBanned = "No";

          for (let i = 0; i < bannedUsers.length; i++) {
            if (bannedUsers[i] === String(user.id)) {
              //if the user has already been banned from using the bot
              userIsBanned = "Yes";
            }
          }
          for (let i = 0; i < bannedOwners.length; i++) {
            if (bannedOwners[i] === String(user.id)) {
              //if the owner has already been banned from using the bot
              ownerIsBanned = "Yes";
            }
          }

          const isBot = !user.bot ? "No" : "Yes";

          const Embed = new MessageEmbed()
            .setColor("#ff3505")
            .setTitle(`Who is this user?`)
            .setThumbnail(
              `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpeg`
            )
            .addFields(
              { name: "User's Name:", value: user.username, inline: true },
              { name: "User's ID", value: user.id, inline: true },
              { name: "User's Tag", value: user.tag },
              { name: "Is the user a bot?", value: isBot },
              {
                name: "User Banned?",
                value: userIsBanned.toString(),
                inline: true,
              },
              {
                name: "Owner Banned?",
                value: ownerIsBanned.toString(),
                inline: true,
              }
            )
            .setFooter(
              `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
              "https://playantares.com/resources/icon.png"
            );
          channel.send({ embeds: [Embed] });
        });
      } catch (e) {
        channel.send("The User ID you entered is not valid. Please try again.");
      }
    } else if (type.toLowerCase() == "server") {
      let guild = client.guilds.cache.get(id);
      if (guild) {
        const doc = await piiModel.findOne({ GUILD_ID: guild.id }); //find the entry for the guild
        const Embed = new MessageEmbed()
          .setColor("#ff3505")
          .setTitle(`Server: ${guild.name}`)
          .setThumbnail(
            guild.iconURL() || "https://cdn.discordapp.com/embed/avatars/0.png"
          )
          .addFields([
            { name: "Guild Creation Date:", value: guild.createdAt },
            { name: "Guild Join Date:", value: doc.GUILD_JOIN_DATE },
            { name: "Guild Name:", value: guild.name },
            { name: "Guild ID:", value: guild.id },
            { name: "Owner ID:", value: guild.ownerId },
            {
              name: "Guild Member Count:",
              value: guild.memberCount.toString(),
            },
          ])
          .setFooter(
            `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
            "https://playantares.com/resources/icon.png"
          );
        channel.send({ embeds: [Embed] });
      }
    }
  },
} as ICommand;
