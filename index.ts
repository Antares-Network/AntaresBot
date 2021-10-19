//Nate Goldsborough
//Antares Network Discord Bot
//https://playantares.com
//Built for discord.js V.13.1.0
//Project started on December 15, 2020
import DiscordJs, { Intents, MessageEmbed } from "discord.js";
import { AutoPoster } from 'topgg-autoposter'
import WOKCommands from "wokcommands";
import mongoose from "mongoose";
import path from "path";
import dotenv from "dotenv";
import chalk from "chalk";
import gateModel from "./models/gate";
import piiModel from "./models/pii";
import guildModel from "./models/guild";
import onReady from "./actions/onReady";
import counting from "./functions/counting";
import messageLog from "./actions/messageLog";
import docCreate from "./actions/docCreate";
import piiCreate from "./actions/piiCreate";
import guildUpdate from "./actions/guildUpdate";
dotenv.config();


//Create a new discord client
const client = new DiscordJs.Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
  ],
});

if (process.env.TOP_GG_TOKEN) {
  const ap = AutoPoster(String(process.env.TOP_GG_TOKEN), client);
  ap.on('posted', () => console.log(chalk.green('Posted to top.gg')));
}


//connect to MongoDB and then log bot into Discord
(async () => {
  //Connect to MongoDB
  console.log(
    chalk.yellow("Trying to connect to MongoDB\nPlease wait for a connection")
  );
  await mongoose
    .connect(String(process.env.BOT_MONGO_PATH), {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .catch((error) => {
      console.log(
        chalk.red.bold(
          `There was an error connecting to the database:\n ${error}`
        )
      );
      process.exit(1);
    });
  console.log(chalk.green("Connected to MongoDB"));

  //login to the discord api
  console.log(
    chalk.yellow(
      "Trying to login to the Discord API\nPlease wait for a connection"
    )
  );
  client.login(process.env.BOT_TOKEN).catch((error) => {
    console.log(
      chalk.red.bold(
        `There was an error connecting to the database:\n ${error}`
      )
    );
    process.exit(1);
  });
  console.log(chalk.green("Logged into the Discord API"));
})();

//on ready event create a WOK commands instance and print some info
client.on("ready", () => {
  onReady.event(client);
  // Print the bot's username and discriminator to the console
  if (client.user)
    console.log(`Logged in as`, `${chalk.magenta(client.user.tag)}`);

  //give WOK a db connection
  const dbOptions = {
    keepAlive: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  };
  //create the WOK client object
  const wok = new WOKCommands(client, {
    commandsDir: path.join(__dirname, "commands"),
    featuresDir: path.join(__dirname, "features"),
    typeScript: true,
    testServers: [String(process.env.TEST_SERVERS)],
    dbOptions,
    mongoUri: String(process.env.BOT_MONGO_PATH),
    disabledDefaultCommands: ["help", "language"],
  })
    .setDefaultPrefix(String(process.env.BOT_DEFAULT_PREFIX))
    .setBotOwner("603629606154666024"); //! for some reason it doesn't like when i grab this value from the env file

  wok.on("databaseConnected", async () => {
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

  // Send a message to the bot owner that the bot has started and is online
  client.users.fetch(String(process.env.BOT_OWNER_ID)).then((user) => {
    user.send(`I have just restarted and am now back online.`);
    console.log(chalk.green.bold(`Bot startup dm sent.`));
  });

  //Startup complete
  console.log(chalk.green.bold("Startup complete. Listening for input..."));
});


// on message event console log messages in the appropriate format
client.on("messageCreate", async (message) => {
  //Get the gate data at the start of each message create event
  const gate = await gateModel.findOne({ NAME: "GATE" });

  // ignore ignored guilds, bots, and itself
  if (message.guild && gate.IGNORED_GUILDS.includes(message.guild.id)) return;
  if (message.author.bot) return;
  //log dms and guild messages to the console but do not store them
  if (message.channel.type === "DM") {
    console.log(
      `${chalk.blue.bold(`DM`)} ${chalk.yellow(
        `[${message.author.username}]`
      )} ${chalk.grey.bold(`--`)} ${chalk.cyan(`[${message.content}]`)}`
    );
    client.users.fetch(String(process.env.BOT_OWNER_ID)).then((user) => {
      user.send(`**${message.author.username}** sent: \n\`${message.content}\` \nnto the bot.`)
    });
  }
  if (message.channel.type === "GUILD_TEXT") {
    console.log(
      `${chalk.magenta.bold(`MESSAGE`)} ${chalk.green(
        `[${message.channel.guild.name}]`
      )} ${chalk.blue(`[${message.channel.name}]`)} ${chalk.yellow(
        `[${message.author.username}]`
      )} ${chalk.grey.bold(`--`)} ${chalk.cyan(`[${message.content}]`)}`
    );
    try {
      counting.count(message, client); // counting logic
      messageLog.log(message); // log number of messages sent in each guild
    } catch (e) {
      //! change this to a more descriptive error message
      console.log(
        "Error on guild lookup. Maybe from a message sent in a DM to the bot"
      );
    }
  }
});

//on message delete event log the message to the console in the appropriate format
client.on("messageDelete", async (message) => {
  const gate = await gateModel.findOne({ NAME: "GATE" });
  if (message.author?.bot) return;
  if (message.member?.user.bot) return;
  if (message.channel.type != "DM") {
    if (gate.IGNORED_GUILDS.includes(message.guild?.id)) return;
    console.log(
      `${chalk.red.bold(`DELETED`)} ${chalk.green(
        `[${message.channel.guild.name}]`
      )} ${chalk.blue(`[${message.channel.name}]`)} ${chalk.yellow(
        `[${message.author?.username}]`
      )} ${chalk.grey.bold(`--`)} ${chalk.cyan(`[${message.content}]`)}`
    );
  }
});

//actions to run when the bot joins a server
client.on("guildCreate", (guild) => {
  docCreate.event(guild, client)
  piiCreate.event(guild, client);
});

//actions to run when the bot leaves a server
client.on("guildDelete", async (guild) => {
  if(guild.available) {
    const doc = await guildModel.findOne({ GUILD_ID: guild.id });
    console.log(guild)
    const d = new Date();
    const Embed = new MessageEmbed()
      .setColor("#ff3505")
      .setTitle(`I Left a Server`)
      .setThumbnail(
        String(
          guild.iconURL() || "https://cdn.discordapp.com/embed/avatars/0.png"
        )
      )
      .addFields([
        { name: "Guild Creation Date:", value: guild.createdAt.toString() },
        { name: "Guild Leave Date:", value: d.toString() },
        { name: "Guild Name:", value: guild.name },
        { name: "Guild ID:", value: guild.id },
        { name: "Owner ID:", value: guild.ownerId },
        { name: "Guild Member Count:", value: doc?.GUILD_MEMBER_COUNT },
      ])
      .setFooter(
        `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
        "https://playantares.com/resources/icon.png"
      );
    try {
      await guildModel.findOneAndDelete({ GUILD_ID: guild.id });
      await piiModel.findOneAndDelete({ GUILD_ID: guild.id });
      client.users.fetch(String(process.env.BOT_OWNER_ID)).then((user) => {
        user.send({ embeds: [Embed] });
      });
    } catch (e) {
      console.log(e);
    }
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

client.on("guildUpdate", (oldGuild, newGuild) => {
  guildUpdate.update(oldGuild, newGuild, client);
});

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

//! deal with errors to the console and how to exit gracefully
client.on('error', console.error);
client.on("warn", (e) => console.warn(e));
process.on("exit", (code) => {
  console.log("Now exiting...");
  console.log(`Exited with status code: ${code}`);
}); //!wtf this is really poor coding
process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});