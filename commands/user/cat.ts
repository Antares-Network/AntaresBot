import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import statcord from "../../index"
import axios from "axios";

export default {
  name: "cat",
  category: "user",
  description: "Sends a random cat image",
  aliases: ["kitty", "kitten"],
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, message, channel }) => {
    if (await check.check(message, client)) {
      statcord.statcord.postCommand("cat", message.author.id);
      axios
        .get("https://aws.random.cat/meow")
        .then(function (response) {
          const Embed = new MessageEmbed()
            .setColor("#ff3505")
            .setTitle("Random Cat Picture")
            .setImage(response.data.file)
            .setFooter(
              `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
              "https://playantares.com/resources/icon.png"
            );
          channel.send({ embeds: [Embed] });
        })
        .catch((error) => {
          // Handle the error
          console.log(error);
          return `**\`Err:\`** Socket hang up. Please try again.`;
        });
    }
  },
} as ICommand;
