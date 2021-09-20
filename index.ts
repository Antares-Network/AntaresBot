import DiscordJs, { Intents } from 'discord.js';
import WOKCommands from 'wokcommands';
import mongoose from "mongoose";
import path from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';
//! import gateModel from '/models/gate.ts';


dotenv.config();

const client = new DiscordJs.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
});

//connect to MongoDB and then log bot into Discord
(async () => {
	//Connect to MongoDB
	console.log(chalk.yellow('Trying to connect to MongoDB\nPlease wait for a connection'));
	await mongoose.connect(String(process.env.BOT_MONGO_PATH), {
		useNewUrlParser: true,
		useUnifiedTopology: true
    })
	.catch((error) => {
		console.log(chalk.red.bold(`There was an error connecting to the database:\n ${error}`))
		process.exit(1)
	})
	console.log(chalk.green('Connected to MongoDB'));

	//! const gate = await gateModel.findOne({ NAME: 'GATE' });

	//login to the discord api
	console.log(chalk.yellow('Trying to login to the Discord API\nPlease wait for a connection'));
	client.login(process.env.BOT_TOKEN).catch((error) => {
		console.log(chalk.red.bold(`There was an error connecting to the database:\n ${error}`))
		process.exit(1)
	})
	console.log(chalk.green("Logged into the Discord API"));
	console.log(`Logged in as`, `${chalk.magenta(client.user.tag)}`);


	//Set the activity of the bot
	client.user!.setActivity(`&help | V: ${process.env.VERSION}`, { type: 'PLAYING' })
	console.log(`Set bot status to: ${chalk.cyan(`&help`)} V: ${chalk.cyan(process.env.VERSION)}`);
	

	//Print some bot stats
	console.log(`${chalk.yellow('I am in')} ${chalk.green(client.guilds.cache.size)} ${chalk.yellow('servers')}`)
	try {
		//! console.log(`${chalk.yellow('I am being used by')} ${chalk.green(gate.TOTAL_USERS)} ${chalk.yellow('users')}`)
	} catch (e) {
		console.log(e);
	}

	console.log(chalk.green("The bot is online."));
	console.log(chalk.green.bold("Startup script has run"));

})() //idk why these () are needed but they are






client.on('ready', async () => {
    new WOKCommands(client, {
        commandDir: path.join(__dirname, 'commands'),
        typeScript: true,
        testServers: ['788541416740487218']
    })
    .setDefaultPrefix('&')
    .setBotOwner('603629606154666024')
});

client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));

process.on('exit', (code) => {
	console.log("Now exiting...");
    console.log(`Exited with status code: ${code}`);
  });