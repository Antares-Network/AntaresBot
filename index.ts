//Nate Goldsborough
//Antares Network Discord Bot
//https://playantares.com
//Built for discord.js V.13.6.0
//Project started on December 15, 2020
import DiscordJs, { Intents } from "discord.js";
const dbots = require('dbots')
import Statcord from "statcord.js";
import WOKCommands from "wokcommands";
import path from "path";
import dotenv from "dotenv";
import chalk from "chalk";
import onDBConnect from "./actions/onDBConnect";
import { Player } from "@discordx/music"
dotenv.config();

//Create a new discord client
const client = new DiscordJs.Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES
  ],
});

const player = new Player();

const statcord = new Statcord.Client({
  client,
  key: String(process.env.STATCORD_API_KEY),
  postCpuStatistics:
    true,
  postMemStatistics:
    true,
  postNetworkStatistics:
    true,
});

statcord.on("autopost-start", () => {
  console.log("Started autopost");
});

statcord.on("post", (status) => {
  if (status) console.error(status);
});

//on ready event create a WOK commands instance and print some info
client.on("ready", () => {
  // Print the bot's username and discriminator to the console
  if (client.user)
    console.log(`Logged in as`, `${chalk.magenta(client.user.tag)}`);

  //give WOK a db connection
  const dbOptions = {
    keepAlive: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
  };
  //create the WOK client object
  const wok = new WOKCommands(client, {
    commandsDir: path.join(__dirname, "commands"),
    featuresDir: path.join(__dirname, "features"),
    typeScript: true,
    testServers: ["788541416740487218", "775216104012120124"],
    dbOptions,
    mongoUri: String(process.env.BOT_MONGO_PATH),
    disabledDefaultCommands: ["help", "language"],
    botOwners: ['603629606154666024']
  })
    .setDefaultPrefix(String(process.env.BOT_DEFAULT_PREFIX))

  wok.on("databaseConnected", async  () => {
    console.log(chalk.green("Connected to MongoDB"));

    onDBConnect.event(client)
    .catch(err => console.log(err));
    statcord.autopost();
  });

  // Send a message to the bot owner that the bot has started and is online
  client.users.fetch(String(process.env.BOT_OWNER_ID)).then((user) => {
    user.send(`I have just restarted and am now back online.`);
    console.log(chalk.green.bold(`Bot startup dm sent.`));
  });

  let poster = new dbots.Poster({
    client,
    apiKeys: {
      bladebotlist: String(process.env.BLADEBOTLIST_TOKEN),
      topgg: String(process.env.TOP_GG_TOKEN),
      discordboats: String(process.env.DISCORD_BOATS_TOKEN),
      discordbotsgg: String(process.env.DISCORD_BOTS_GG_TOKEN),
      discordlabs: String(process.env.DISCORD_LABS_TOKEN),
      botsfordiscord: String(process.env.BOTS_FOR_DISCORD_TOKEN),
    },
    clientLibrary: "discord.js",
  });

  poster.startInterval();


  //Startup complete
  console.log(chalk.green.bold("Startup complete. Listening for input..."));
});

client.login(process.env.BOT_TOKEN).catch((error) => {
  console.log(chalk.red.bold(`There was an error connecting to the Discord`));
  console.error(error);
  process.exit(1);
});

//! deal with errors to the console and how to exit gracefully
client.on("error", console.error);
client.on("warn", (e) => console.warn(e));
process.on("exit", (code) => {
  console.log("Now exiting...");
  console.log(`Exited with status code: ${code}`);
}); //!wtf this is really poor coding
process.on("unhandledRejection", (promise, reason) => {
  console.error("Unhandled promise rejection:", promise, "\nreason", reason);
});

export { statcord, player };