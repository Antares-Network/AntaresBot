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
import gateModel from './models/gate'
import onReady from './actions/onReady';


const client = new DiscordJs.Client({
    intents: [
        Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MEMBERS,
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


	//login to the discord api
	console.log(chalk.yellow('Trying to login to the Discord API\nPlease wait for a connection'));
	client.login(process.env.BOT_TOKEN).catch((error) => {
		console.log(chalk.red.bold(`There was an error connecting to the database:\n ${error}`))
		process.exit(1)
	})
	console.log(chalk.green("Logged into the Discord API"));
})()


client.on('ready', async () => {
	onReady.event(client);
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
	const wok = new WOKCommands(client, {
		commandDir: path.join(__dirname, 'commands'),
        typeScript: true,
        testServers: [String(process.env.TEST_SERVERS)],
		dbOptions,
    	mongoUri: String(process.env.BOT_MONGO_PATH)
    })
    .setDefaultPrefix(String(process.env.BOT_DEFAULT_PREFIX))
    .setBotOwner('603629606154666024')

	wok.on("databaseConnected", async (connection, state) => {
		//Print some bot stats
		console.log(`${chalk.yellow('I am in')} ${chalk.green(client.guilds.cache.size)} ${chalk.yellow('servers')}`)
		try {
			const gate = await gateModel.findOne({ NAME: 'GATE' });
			console.log(`${chalk.yellow('I am being used by')} ${chalk.green(gate.TOTAL_USERS)} ${chalk.yellow('users')}`)
		} catch (e) {
			console.log(e);
		}
	})
	
	
	//Set the activity of the bot
	if (client.user){
		client.user.setActivity('activity', { type: 'WATCHING' })
		client.user.setActivity(`&help | V: ${process.env.VERSION}`, { type: 'PLAYING' })
		console.log(`Set bot status to: ${chalk.cyan(`&help`)} V: ${chalk.cyan(process.env.VERSION)}`);
	}
	
	
	
	

	client.users.fetch(String(process.env.BOT_OWNER_ID)).then(user => {
		user.send(`I have just restarted and am now back online.`);
		console.log(chalk.green.bold(`Bot startup dm sent.`))
	})
	console.log(chalk.green.bold("Startup complete. Listening for input..."));


});

client.on("messageCreate", (message) => {
	if (message.author.bot) return;
	if (message.channel.type === "DM") {
		console.log(`${chalk.blue.bold(`DM`)} ${chalk.yellow(`[`+message.author.username+`]`)} ${chalk.grey.bold(`--`)} ${chalk.cyan(`[`+message.content+`]`)}`)
	}
	if (message.channel.type === "GUILD_TEXT"){
		console.log(`${chalk.magenta.bold(`MESSAGE`)} ${chalk.green(`[`+message.channel.guild.name+`]`)} ${chalk.blue(`[`+message.channel.name+`]`)} ${chalk.yellow(`[`+message.author.username+`]`)} ${chalk.grey.bold(`--`)} ${chalk.cyan(`[`+message.content+`]`)}`);	
	}
});


client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));

process.on('exit', (code) => {
	console.log("Now exiting...");
    console.log(`Exited with status code: ${code}`);
});