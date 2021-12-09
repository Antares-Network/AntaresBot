import { Client, MessageEmbed } from "discord.js";
import WOKCommands from "wokcommands";
import docCreate from "../actions/docCreate";
import piiCreate from "../actions/piiCreate";
import guildModel from "../models/guild";
import piiModel from "../models/pii";
import guildUpdate from "../actions/guildUpdate";
import chalk from "chalk";

export default (client: Client, instance: WOKCommands) => {
  //actions to run when the bot joins a server
  client.on("guildCreate", (guild) => {
    docCreate.event(guild, client);
    piiCreate.event(guild, client);
  });

  //actions to run when the bot leaves a server
  client.on("guildDelete", async (guild) => {
    if (guild.available) {
      const doc = await guildModel.findOne({ GUILD_ID: guild.id });
      console.log(guild);
      const d = new Date();
      const Embed = new MessageEmbed()
        .setColor("#ff3505")
        .setTitle(`I Left a Server`)
        .setThumbnail(
          String(
            guild.iconURL() || "https://cdn.discordapp.com/embed/avatars/0.png"
          )
        )
        .addFields([
          { name: "Guild Creation Date:", value: guild.createdAt.toString() },
          { name: "Guild Leave Date:", value: d.toString() },
          { name: "Guild Name:", value: guild.name },
          { name: "Guild ID:", value: guild.id },
          { name: "Owner ID:", value: guild.ownerId },
          { name: "Guild Member Count:", value: doc?.GUILD_MEMBER_COUNT },
        ])
        .setFooter(
          `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );
      try {
        await guildModel.findOneAndDelete({ GUILD_ID: guild.id });
        await piiModel.findOneAndDelete({ GUILD_ID: guild.id });
        client.users.fetch(String(process.env.BOT_OWNER_ID)).then((user) => {
          user.send({ embeds: [Embed] });
        });
      } catch (e) {
        console.log(e);
      }
    }
  });

  client.on("guildUpdate", (oldGuild, newGuild) => {
    guildUpdate.update(oldGuild, newGuild, client);
  });
};

export const config = {
  dbName: "GUILD_EVENTS",
  displayName: "Guild Events",
};
