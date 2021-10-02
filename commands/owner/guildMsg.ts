//This command is used only by the bot owner to send critical messages to a server's admin channel
//it is ONLY USED IN CRITICAL SITUATIONS, such as security bugs, data breaches, etc
//Every attempt is made to not use this function , such as sending a dm to the server owner, et
//before this command is used.

import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import piiModel from "../../models/pii";
import gateModel from "../../models/gate";

export default {
  category: "owner",
  description: "Sends an guildMsg to every guild the bot is in",
  slash: false,
  example: "guildMsg HI",
  guildOnly: true,
  ownerOnly: true,
  hidden: true,

  callback: async ({ client, text }) => {
    const gate = await gateModel.findOne({ NAME: "GATE" });
    //get the list of guilds the bot is in
    var guildList = client.guilds?.cache;

    try {
      //send a message to every guild this bot is in
      let embed = new MessageEmbed()
        .setColor("#ff3505")
        .setURL("https://discord.gg//KKYw763")
        .setTitle("Antares Bot -- System Update Message")
        .setDescription(
          "I have just flown in to tell you that my developers have something to say:"
        )
        .addField("Message:", `${text}`)
        .setFooter(
          `Set a default channel yet with ${process.env.BOT_DEFAULT_PREFIX}setup | Antares Bot | ${process.env.VERSION}`,
          "https://playantares.com/resources/icon.png"
        );
      guildList.forEach(async (guild) => {
        if (await gate.IGNORED_GUILDS.includes(guild.id)) return;
        const doc = await piiModel.findOne({ GUILD_ID: guild.id }); //find the entry for the guild
        if (doc.GUILD_DEFAULT_CHANNEL != null) {
          //send the message in the default channel for this guild
          (
            guild?.channels.cache.get(doc?.GUILD_DEFAULT_CHANNEL) as TextChannel
          ).send({ embeds: [embed] });
        } else {
          (
            guild?.channels.cache.find(
              (c) => c?.type === "GUILD_TEXT"
            ) as TextChannel
          ).send({ embeds: [embed] });
        }
      });
    } catch (err) {
      //if there was an error send it here
      console.log(err);
    }
  },
} as ICommand;
