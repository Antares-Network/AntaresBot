//Nate Goldsborough
//Antares Network Discord Bot 
//This project will morph overtime
//built for discord.js V.12.5.1
//
//onReady.js -- this will handle all the tasks that need to happen on bot startup, like connecting to any API's, servers, checking for updates
//connecting to databases, etc
const guildModel = require('../models/guild');
const piiModel = require('../models/pii');
const docCreate = require('./docCreate');
const piiCreate = require('./piiCreate');
const gateCreate = require('./gateCreate');
const gateModel = require('../models/gate');


module.exports = {
	event: async function (bot) {
		const gate = await gateModel.findOne({ NAME: 'GATE' }); //find the entry for the guild
		bot.guilds.cache.forEach(async guild => {
			const doc = await guildModel.findOne({ GUILD_ID: guild.id }); //find the entry for the guild
			const req = await piiModel.findOne({ GUILD_ID: guild.id }); //find the entry for the guild
			const gate = await gateModel.findOne({ NAME: 'GATE' }); //find the entry for the guild
			if (doc === null) {
				docCreate.event(guild, bot);
				console.log('Made new doccument'.yellow);
			}
			if (req == null) {
				piiCreate.event(guild, bot);
				console.log("Created PII doc".yellow);
			}
		});
		if (gate == null) {
			console.error("NO GATE FOUND. CLOSING BOT.")
			bot.user.setActivity(`❗❗DB ERROR❗❗`, { type: 'PLAYING' });
			setTimeout(() => {
			gateCreate.event(bot);
			console.log('\n\n\n\n\n\n\n\n')
			bot.destroy();
			console.log("Signed out of the Discord API".red.bold);
			bot.login(process.env.BOT_TOKEN).catch(e => console.error(e));
			console.log('Trying to login to the Discord API\nPlease wait for a connection'.yellow);
			console.log("Logged into the Discord API".green.bold);
			console.log("Startup script has run".red.bold);
			}, 5000);
		} else {
			bot.user.setActivity(`&help | V: ${botVersion}`, { type: 'PLAYING' });
		}
		console.log(`Set bot status to:`, `&help`.magenta, `| V:`, `${botVersion}`.magenta);
		console.log(`Logged in as`, `${bot.user.tag}`.magenta);
		console.log("The bot is online.".green);
		try {
			console.log(`I am in`.yellow, `${gate.TOTAL_SERVERS}`.green, ` servers`.yellow)
			console.log(`I am being used by`.yellow, `${gate.TOTAL_USERS}`.green, `users`.yellow)
		} catch (e) {
			console.log(e);
		}
		console.log(`The bot is ready...`.red.bold)
	}
};
