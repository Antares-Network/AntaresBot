const { CommandoClient } = require('discord.js-commando');
const MongoDBProvider = require('commando-provider-mongo').MongoDBProvider;
const mongoose = require('mongoose');
const path = require('path');
const onReady = require('./actions/onReady');
require('dotenv').config();
require('colors');
global.botVersion = "Github actions test";
console.log("starting")


async function startup() {
	var mongo_uri = String(process.env.BOT_MONGO_PATH);
	console.log('Trying to connect to MongoDB\nPlease wait for a connection'.yellow);
	await mongoose.connect(mongo_uri, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false
	})
	.catch((error) => {
		console.log(`There was an error connecting to the database:\n ${error}`)
		process.exit(1)
	})
	console.log('Connected to MongoDB'.green.bold);
	
	console.log(`Override default settings provider...`.bold.green)
	bot.setProvider(
		new MongoDBProvider(mongoose.connections[0].getClient(), process.env.BOT_SETTINGS_PATH)
	).catch((error) => {
		console.log(`There was an error connecting to the database:\n ${error}`)
		process.exit(1)
	})
	console.log(`Connected MDB settings provider`.bold.cyan)


	//login to the discord api
	console.log('Trying to login to the Discord API\nPlease wait for a connection'.yellow);
	bot.login(process.env.BOT_TOKEN).catch((error) => {
		console.log(`There was an error connecting to the database:\n ${error}`)
		process.exit(1)
	})
	console.log("Logged into the Discord API".green.bold);
}
startup();

global.bot = new CommandoClient({
	commandPrefix: '&',
	owner: '603629606154666024',
	disableEveryone: true
});



//register the commands
bot.registry
	.registerDefaultTypes()
	.registerGroups([
		['user', 'Commands for regular users'],
		['admin', 'Commands for admins'],
		['owner', 'Commands for the bot owner'],
		['antares', 'Commands to be used in the Antares Server']
	])
	.registerDefaultGroups()
	.registerDefaultCommands({
		help: false,
		ping: false,
		eval: false,
		unknownCommand: false
	})
	.registerCommandsIn(path.join(__dirname, 'commands'));


//actions to run at bot startup
bot.on('ready', async () => {
	await onReady.event(bot);
	setTimeout(async () => {
		console.log("Startup script has run".red.bold);
		console.log("All processes completed successfully.");
		console.log("Now exiting...");
		process.exit(0);
	}, 10000);
});

//report any errors to the console
bot.on("error", (e) => console.error(e));
bot.on("warn", (e) => console.warn(e));

process.on('exit', (code) => {
    console.log(`Exited with status code: ${code}`);
  });