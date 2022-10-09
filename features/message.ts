import { Client } from "discord.js";
import gateModel from "../models/gate";
import counting from "../functions/counting";
import messageLog from "../actions/messageLog";
import chalk from "chalk";

export default (client: Client): void => {
	// on message event console log messages in the appropriate format
	client.on("messageCreate", async (message) => {
		//Get the gate data at the start of each message create event
		const gate = await gateModel.findOne({ NAME: "GATE" });

		// ignore ignored guilds, bots, and itself
		if (message.guild && gate.IGNORED_GUILDS.includes(message.guild.id)) return;
		if (message.author.bot) return;
		//log dms and guild messages to the console but do not store them
		if (message.channel.type === "DM") {
			client.users.fetch(String(process.env.BOT_OWNER_ID)).then((user) => {
				user.send(`**${message.author.username}** sent: \n\n${message.content} \n\nto the bot.`);
			});
		}
		if (message.channel.type === "GUILD_TEXT") {
			const d = new Date();
			console.log(
				`${chalk.magenta.bold(`MESSAGE`)} ${chalk.green(`[${message.channel.guild.name}]`)} ${chalk.blue(
					`[${message.channel.name}]`
				)} ${chalk.yellow(`[${message.author.username}]`)} ${chalk.grey.bold(`--`)} ${chalk.cyan(`[${message.content}]`)}`
			);
			if (message.attachments.size > 0) {
				console.log(
					`${chalk.magenta.bold(`ATTACHMENT`)} ${chalk.green(`[${message.channel.guild.name}]`)} ${chalk.blue(
						`[${message.channel.name}]`
					)} ${chalk.yellow(`[${message.author.username}]`)} ${chalk.grey.bold(`--`)} ${chalk.red.bold(
						`[${message.attachments.first()?.url}]`
					)}`
				);
			}
			try {
				counting.count(message, client).catch((err) => console.log(err));
				// counting logic
				messageLog.log(message).catch((err) => console.log(err));
				// log number of messages sent in each guild
			} catch (e) {
				//! change this to a more descriptive error message
				console.log("Error on guild lookup. Maybe from a message sent in a DM to the bot");
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
				`${chalk.red.bold(`DELETED`)} ${chalk.green(`[${message.channel.guild.name}]`)} ${chalk.blue(
					`[${message.channel.name}]`
				)} ${chalk.yellow(`[${message.author?.username}]`)} ${chalk.grey.bold(`--`)} ${chalk.cyan(`[${message.content}]`)}`
			);
		}
	});
};

export const config = {
	dbName: "MESSAGE_EVENTS",
	displayName: "Message Events",
};
