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
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
});

//connect to MongoDB and then log bot into Discord
(async () => {
	var mongo_uri = String(process.env.BOT_MONGO_PATH);
	console.log('Trying to connect to MongoDB\nPlease wait for a connection');
	await mongoose.connect(mongo_uri, {
		useNewUrlParser: true,
		useUnifiedTopology: true
    })
	.catch((error) => {
		console.log(`There was an error connecting to the database:\n ${error}`)
		process.exit(1)
	})
	console.log('Connected to MongoDB');

	//login to the discord api
	console.log('Trying to login to the Discord API\nPlease wait for a connection');
	client.login(process.env.BOT_TOKEN).catch((error) => {
		console.log(`There was an error connecting to the database:\n ${error}`)
		process.exit(1)
	})
	console.log("Logged into the Discord API");
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