const { CommandoClient } = require('discord.js-commando');
const { connect } = require('mongoose');
require('dotenv').config();
require('colors');
const path = require('path');
const onReady = require('./actions/onReady');

const bot = new CommandoClient({
    commandPrefix: '*',
    owner: '603629606154666024',
    disableEveryone: true
});

bot.registry
    .registerDefaultTypes()
    .registerGroups([
        ['user', 'Commands for regular users'],
        ['admin', 'Commands for admins'],
        ['owner', 'Commands for the bot owner']
    ])
    .registerDefaultGroups()
    .registerDefaultCommands({
        help: false,
        ping: false,
        unknownCommand: false
    })
    .registerCommandsIn(path.join(__dirname, 'commands'));

//actions to run at bot startup
bot.on('ready', async () => {
    onReady.event(bot)
	console.log("Startup script has run".red.bold)
});


//connect to MongoDB and then log bot into Discord
(async () => {
	var mongo_uri = String(process.env.BOT_MONGO_PATH);
	console.log('Trying to connect to MongoDB\nPlease wait for a connection'.yellow);
	await connect(mongo_uri, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false
	});
	console.log('Connected to MongoDB'.green.bold);

	//login to the discord api
	console.log('Trying to login to the Discord API\nPlease wait for a connection'.yellow);
	bot.login(process.env.BOT_TOKEN).catch(e => console.error(e));
	console.log("Logged into the Discord API".green.bold);
})()