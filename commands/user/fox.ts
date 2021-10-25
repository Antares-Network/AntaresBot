import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";
import axios from "axios";
import check from "../../functions/channelCheck";
import statcord from "../../index"

export default {
  name: "fox",
  category: "user",
  description: "Sends a random fox image",
  aliases: ["duckling"],
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, channel, message }) => {
    if (await check.check(message, client)) {
      statcord.statcord.postCommand("fox", message.author.id);
      axios
        .get("https://randomfox.ca/floof/")
        .then(function (response) {
          const Embed = new MessageEmbed()
            .setColor("#ff3505")
            //.setURL('https://dsc.gg/antaresnetwork')
            .setTitle("Random Fox Picture")
            .setImage(response.data.image)
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