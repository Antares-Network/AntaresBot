import DiscordJS from "discord.js";
import { ICommand } from "wokcommands";
import piiModel from "../../models/pii";

export default {
  category: "admin",
  description: "Setup command for the default bot channel",
  slash: true,
  guildOnly: true,
  testOnly: true,
  permissions: ["MANAGE_GUILD", "MANAGE_CHANNELS"],
  options: [
    {
      name: "channel",
      description: "The channel to setup",
      type: DiscordJS.Constants.ApplicationCommandOptionTypes.CHANNEL,
      required: true,
    },
  ],

  callback: async ({ channel, interaction, args }) => {
    console.log("test")
    if (args[0] === undefined) {
      channel.send(
        "Please re-run this command and mention a channel as an argument."
      );
    } else {
      //check to see if a default channel is set for this server yet
      const req = await piiModel.findOne({ GUILD_ID: interaction.guild?.id });
      //if the server has a default channel, send it here
      if (req.DEFAULT_CHANNEL_ID !== null) {
        interaction.reply(
          `This server's default channel was: <#${req.GUILD_DEFAULT_CHANNEL}>`
        );
      }
      const doc = await piiModel.findOneAndUpdate(
        { GUILD_ID: interaction.guild?.id },
        {
          $set: {
            GUILD_DEFAULT_CHANNEL: interaction.options.getChannel('channel'),
          },
        },
        { new: true }
      );
      interaction.reply(
        `Set the default channel to <#${doc.GUILD_DEFAULT_CHANNEL}>`
      );
      await doc.save();
    }
  },
} as ICommand;
