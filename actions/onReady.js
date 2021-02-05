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
			gateCreate.event(bot);
			console.error("NO GATE FOUND. CLOSING BOT.")
		}
		bot.user.setActivity(`&help | V: ${botVersion}`, { type: 'PLAYING' });
		console.log(`Set bot status to:`, `&help`.magenta, `| V:`, `${botVersion}`.magenta);
		console.log(`Logged in as`, `${bot.user.tag}`.magenta);
		console.log("The bot is online.".green);
		console.log(`I am in`.yellow, `${gate.TOTAL_SERVERS}`.green, ` servers`.yellow)
		console.log(`I am being used by`.yellow, `${gate.TOTAL_USERS}`.green, `users`.yellow)
		console.log(`The bot is ready...`.red.bold)
	}
};
