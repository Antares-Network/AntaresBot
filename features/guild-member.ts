import { Client } from "discord.js";
import guildModel from "../models/guild";
import gateModel from "../models/gate";
import chalk from "chalk";

export default (client: Client): void  => {
  // needs GUILD_MEMBER intent which is privileged
  client.on("guildMemberRemove", async (member) => {
    // if the member that joined a server is in the list of ignored guilds, do not log them
    const doc = await gateModel.findOne({ NAME: "GATE" });
    if (doc.IGNORED_GUILDS.includes(member.guild.id)) return;
    console.log(
      `${chalk.red.bold(`MEMBER LEFT`)} ${chalk.green(
        `[${member.guild.name}]`
      )} ${chalk.blue(`[${member.user?.username}]`)}`
    );
    try {
      await guildModel.findOneAndUpdate(
        { GUILD_ID: member.guild.id },
        { $set: { GUILD_MEMBER_COUNT: member.guild.memberCount } },
        { new: true }
      );
    } catch (e) {
      console.log(e);
    }
  });

  // needs GUILD_MEMBER intent which is privileged
  client.on("guildMemberAdd", async (member) => {
    // if the member that joined a server is in the list of ignored guilds, do not log them
    const doc = await gateModel.findOne({ NAME: "GATE" });
    if (doc.IGNORED_GUILDS.includes(member.guild.id)) return;
    console.log(
      `${chalk.green.bold(`MEMBER JOINED`)} ${chalk.green(
        `[${member.guild.name}]`
      )} ${chalk.blue(`[${member.user.username}]`)}`
    );
    try {
      await guildModel.findOneAndUpdate(
        { GUILD_ID: member.guild.id },
        { $set: { GUILD_MEMBER_COUNT: member.guild.memberCount } },
        { new: true }
      );
    } catch (e) {
      console.log(e);
    }
  });
};

export const config = {
  dbName: "GUILD_MEMBER_EVENTS",
  displayName: "Guild Member Events",
};
