//Nate Goldsborough
//Antares Network Discord Bot
//https://playantares.com
//Built for discord.js V.13.1.0
//Project started on December 15, 2020
import DiscordJs, { Intents } from "discord.js";
import WOKCommands from "wokcommands";
import path from "path";
import dotenv from "dotenv";
import chalk from "chalk";
import gateModel from "./models/gate";
import onReady from "./actions/onReady";

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

//on ready event create a WOK commands instance and print some info
client.on("ready", () => {
  onReady.event(client)
    .catch(err => console.log(err));
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
  })
    .setDefaultPrefix(String(process.env.BOT_DEFAULT_PREFIX))
    .setBotOwner("603629606154666024"); //! for some reason it doesn't like when i grab this value from the env file

  wok.on("databaseConnected", async  () => {
    console.log(chalk.green("Connected to MongoDB"));

    //Print some bot stats
    console.log(
      `${chalk.yellow("I am in")} ${chalk.green(
        client.guilds.cache.size
      )} ${chalk.yellow("servers")}`
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

  });

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
setTimeout(() => {
  console.log("Startup script has run");
  console.log("All processes completed successfully.");
  console.log("Now exiting...");
  process.exit(0);
}, 30000);