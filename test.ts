//Nate Goldsborough
//Antares Network Discord Bot 
//This project will morph overtime
//built for discord.js V.13.1.0
//Project started on December 15, 2020
import DiscordJs, { Intents } from 'discord.js';
import WOKCommands from 'wokcommands';
import mongoose from "mongoose";
import path from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';
dotenv.config();

const client = new DiscordJs.Client({
    intents: [
        Intents.FLAGS.GUILDS,
		//Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
		Intents.FLAGS.DIRECT_MESSAGES,
		Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
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
})()


client.on('ready', async () => {
	// Print the bot's username and discriminator to the console
	if (client.user) console.log(`Logged in as`, `${chalk.magenta(client.user.tag)}`);

	//give WOK a db connection
	const dbOptions = {
		keepAlive: true,
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false
	}
	//create the WOK client object
	new WOKCommands(client, {
		commandDir: path.join(__dirname, 'commands'),
        typeScript: true,
        testServers: [String(process.env.TEST_SERVERS)],
		dbOptions,
    	mongoUri: String(process.env.BOT_MONGO_PATH)
    })
    .setDefaultPrefix(String(process.env.BOT_DEFAULT_PREFIX))
    .setBotOwner('603629606154666024')
	

	//Set the activity of the bot
	if (client.user){
		client.user.setActivity('activity', { type: 'WATCHING' })
		client.user.setActivity(`&help | V: ${process.env.VERSION}`, { type: 'PLAYING' })
		console.log(`Set bot status to: ${chalk.cyan(`&help`)} V: ${chalk.cyan(process.env.VERSION)}`);
	}

	
	//Print some bot stats
	console.log(`${chalk.yellow('I am in')} ${chalk.green(client.guilds.cache.size)} ${chalk.yellow('servers')}`)
	console.log(chalk.green.bold("Startup complete. Listening for input..."));
	setTimeout(async () => {
		console.log("Startup script has run");
		console.log("All processes completed successfully.");
		console.log("Now exiting...");
		process.exit(0);
	}, 20000);
});



client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));

process.on('exit', (code) => {
	console.log("Now exiting...");
    console.log(`Exited with status code: ${code}`);
});