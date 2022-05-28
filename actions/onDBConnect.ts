import { Client } from "discord.js";
import chalk from "chalk";
import guildModel from "../models/guild";
import gateModel from "../models/gate";
import piiModel from "../models/pii";
import docCreate from "./docCreate";
import piiCreate from "./piiCreate";

async function event(client: Client) {
  client.guilds.cache.forEach(async (guild) => {
    const doc = await guildModel.findOne({ GUILD_ID: guild.id });
    const req = await piiModel.findOne({ GUILD_ID: guild.id });
    if (doc === null) {
      docCreate.event(guild, client)
        .catch(err => console.log(err));
      console.log(chalk.yellow("Made new document"));
    }
    if (req === null) {
      piiCreate.event(guild, client)
        .catch(err => console.log(err));
      console.log(chalk.yellow("Created PII doc"));
    }
  });

  //Print some bot stats
  console.log(
    `${chalk.yellow("I am in")} ${chalk.green((await client.guilds.fetch()).size)} ${chalk.yellow("servers")}`
  );
  try {
    const gate = await gateModel.findOne({ NAME: "GATE" });
    console.log(
      `${chalk.yellow("I am being used by")} ${chalk.green(
        gate.TOTAL_USERS
      )} ${chalk.yellow("users")}`
    );
  } catch (e) {
    console.log(e);
  }
}

export = { event };
