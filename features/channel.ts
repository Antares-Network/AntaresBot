import { Client } from "discord.js";
import WOKCommands from "wokcommands";
import piiModel from "../models/pii";
import chalk from "chalk";

export default (client: Client, instance: WOKCommands) => {
  client.on("channelDelete", async (channel) => {
    // check if the deleted channel is the counting channel and remove that channel from the db
    if (channel.type === "GUILD_TEXT") {
      console.log(
        `${chalk.red.bold(`CHANNEL DELETED`)} ${chalk.green(
          `[${channel.guild?.name}]`
        )} ${chalk.blue(`[${channel.name}]`)}`
      );
      const req = await piiModel.findOne({ GUILD_ID: channel.guild?.id });
      if (channel.id === req.GUILD_COUNTING_CHANNEL_ID) {
        req.GUILD_COUNTING_CHANNEL_ID = null;
        req.save();
      }
    }
  });
};

export const config = {
  dbName: "CHANNEL_EVENTS",
  displayName: "Channel Events",
};
