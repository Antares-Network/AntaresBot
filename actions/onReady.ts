import { Client } from "discord.js";
import chalk from "chalk";
import gateModel from "./../models/gate";
import guildModel from "./../models/guild";
import piiModel from "./../models/pii";
import docCreate from "./docCreate";
import piiCreate from "./piiCreate";
import gateCreate from "./gateCreate";

async function event(client: Client) {
  const gate = await gateModel.findOne({ NAME: "GATE" });

  client.guilds.cache.forEach(async (guild) => {
    const doc = await guildModel.findOne({ GUILD_ID: guild.id });
    const req = await piiModel.findOne({ GUILD_ID: guild.id });
    if (doc === null) {
      docCreate.event(guild, client);
      console.log(chalk.yellow("Made new document"));
    }
    if (req === null) {
      piiCreate.event(guild, client);
      console.log(chalk.yellow("Created PII doc"));
    }
  });

  if (gate === null) {
    console.error("NO GATE FOUND. CLOSING BOT.");
    client.user?.setActivity(`❗❗DB ERROR❗❗`, { type: "PLAYING" });
    setTimeout( () => {
      gateCreate.event(client);
      console.log("\n\n\n\n\n\n\n\n");
      client.destroy();
      client.login(process.env.BOT_TOKEN).catch((e) => console.error(e));
    }, 5000);
  }
}

export = { event };
