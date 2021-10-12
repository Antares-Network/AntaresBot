import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";
import axios from "axios";
import check from "../../functions/channelCheck";

export default {
  name: "mcuser",
  category: "user",
  description: "Gets the username, skin and UUID of a valid minecraft username",
  expectedArgs: "<username>",
  slash: false,
  minArgs: 1,
  maxArgs: 1,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, message, args }) => {
    if (await check.check(message, client)) {
      const username = args[0];
      const url = `https://api.mojang.com/users/profiles/minecraft/${username}`;
      axios.get(url).then((res) => {
        const uuid = res.data.id;
        if (res.data.id) {
          const skin = `https://crafatar.com/renders/body/${uuid}?overlay`;
          const Embed = new MessageEmbed()
            .setColor("#ff3505")
            .setTitle(`${username}'s info`)
            .setImage(skin)
            .setDescription(
              `UUID: ${uuid} \nJoin the Antares Network Minecraft server: **mc.playantares.com**`
            )
            .setFooter(
              `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
              "https://playantares.com/resources/icon.png"
            );
          message.reply({ embeds: [Embed] });
        } else {
          message.reply(`${username} is not a valid username!`);
        }
      });
    }
  },
} as ICommand;
