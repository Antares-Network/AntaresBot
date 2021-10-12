import { ICommand } from "wokcommands";
import piiModel from "../../models/pii";

export default {
  category: "admin",
  description: "Setup command for the default bot channel",
  aliases: ["defaultChannel", "defaultchannel"],
  slash: false,
  guildOnly: true,
  permissions: ["MANAGE_GUILD", "MANAGE_CHANNELS"],

  callback: async ({ channel, message }) => {
    if (message.mentions.channels.first() === undefined) {
      channel.send(
        "Please re-run this command and mention a channel as an argument."
      );
    } else {
      //check to see if a default channel is set for this server yet
      const req = await piiModel.findOne({ GUILD_ID: message.guild?.id });
      //if the server has a default channel, send it here
      if (req.DEFAULT_CHANNEL_ID !== null) {
        channel.send(
          `This server's default channel was: <#${req.GUILD_DEFAULT_CHANNEL}>`
        );
      }
      const doc = await piiModel.findOneAndUpdate(
        { GUILD_ID: message.guild?.id },
        {
          $set: {
            GUILD_DEFAULT_CHANNEL: message.mentions.channels.first()?.id,
          },
        },
        { new: true }
      );
      message.channel.send(
        `Set the default channel to <#${doc.GUILD_DEFAULT_CHANNEL}>`
      );
      await doc.save();
    }
  },
} as ICommand;
