import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";
import piiModel from "./../../models/pii";
import adminChanCheck from "../../functions/adminChanCheck";

export default {
  category: "admin",
  description: "Makes the bot say something",
  slash: false,
  permissions: ["MANAGE_CHANNELS", "MANAGE_GUILD", "MANAGE_MESSAGES"],
  guildOnly: true,

  callback: async ({ client, message }) => {
    if (await adminChanCheck.check(message, client)) {
      const req = await piiModel.findOne({ GUILD_ID: message.guild?.id });

      if (req.GUILD_COUNTING_CHANNEL_ID !== null) {
        const chan = message.guild?.channels.cache.get(
          req.GUILD_COUNTING_CHANNEL_ID
        );
        message.channel.send(
          `You already have a counting channel. It is named <#${chan?.id}>`
        );
      } else {
        message.guild?.channels
          .create("counting", {
            type: "GUILD_TEXT",
          })
          .then(async (channel) => {
            channel.setRateLimitPerUser(
              5,
              "It makes it easier for the bot to function."
            );
            const Embed = new MessageEmbed()
              .setColor("#ff3505")
              .setTitle("Antares Bot Counting")
              .setDescription(
                "Welcome to your very own counting channel.\n" +
                  "Please start counting from `1` using whole numbers.\n\n\n" +
                  "**But first some rules:**" +
                  "\n\nThis channel has a `5 Second` slowmode" +
                  "\n\nYou must alternate players." +
                  "\n\nYou may not send more than one number in a row"
              )
              .setFooter(
                `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
                "https://playantares.com/resources/icon.png"
              );
            channel.send({ embeds: [Embed] });
            await piiModel.updateOne(
              { GUILD_ID: message.guild?.id },
              { GUILD_COUNTING_CHANNEL_ID: channel.id }
            );
          });
      }
    }
  },
} as ICommand;
