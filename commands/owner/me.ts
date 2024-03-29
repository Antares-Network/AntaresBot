import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";

export default {
  category: "owner",
  description: "Sends a message about the server owner",
  slash: true,
  ownerOnly: true,
  testOnly: false,
  hidden: true,

  callback: ({ client }) => {
    const Embed = new MessageEmbed()
      .setColor("#ff3505")
      .setTitle(`Hey its my developer Nate`)
      .setThumbnail(
        `https://antaresnetwork.com/resources/nate_pfp.png`
      )
      .setDescription(
        `<@${process.env.BOT_OWNER_ID}> is my owner and coded me. Ask him anything you might need :)`
      )
      .setFooter({text:
        `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
        "https://antaresnetwork.com/resources/icon.png"
      });
    return Embed;
  },
} as ICommand;
