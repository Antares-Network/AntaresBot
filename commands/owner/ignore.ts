import { ICommand } from "wokcommands";
import gateModel from "../../models/gate";

export default {
  category: "owner",
  description: "Ignores a server completely",
  slash: false,
  expectedArgs: "<serverId>",
  minArgs: 1,
  ownerOnly: true,
  guildOnly: false,

  callback: async ({ client, args, message, channel }) => {
    try {
      let ignoredGuilds = [];
      const gate = await gateModel.findOne({ NAME: "GATE" });
      ignoredGuilds = gate.IGNORED_GUILDS;
      const server = client.guilds.cache.get(args[0]);
      ignoredGuilds.push(args[0]);
      await gateModel.findOneAndUpdate(
        { NAME: "GATE" },
        { $set: { IGNORED_GUILDS: ignoredGuilds } },
        { new: true }
      );
      channel.send(
        `I have been forced to ignore a server by the name \`${server?.name}\`, and ID: \`${args[0]}\` by<@${message.author.id}>`
      );
    } catch (e) {
      message.channel.send(`There was an error: ${e}`);
    }
  },
} as ICommand;
