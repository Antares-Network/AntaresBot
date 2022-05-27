import { Client } from "discord.js";
import gateModel from "../models/gate";
import guildModel from "../models/guild";

export default async (client: Client) => {
	//var init and gc
	let totalUsers = 0;
	let totalMessages = 0;
	let totalServers = 0;
	const totalOwners: Array<string> = [];
	const d = new Date();

	const updateGate = () => {
		//get data from all the guilds
		client.guilds.cache.forEach(async (guild) => {
			const doc = await guildModel.findOne({ GUILD_ID: guild.id });
			totalMessages += Number(doc.GUILD_MESSAGES);
			totalServers++;
			totalOwners.push(guild.ownerId);
			totalUsers += guild.memberCount;
		});
        
		setTimeout(async () => {
		await gateModel.findOneAndUpdate(
				{ NAME: "GATE" },
				{
					$set: {
						GUILD_OWNER_ID: totalOwners,
						TOTAL_MESSAGES: totalMessages,
						TOTAL_SERVERS: totalServers,
						TOTAL_USERS: totalUsers,
						UPDATE_TIME: d.toString(),
					},
				},
				{ new: true }
			);
			console.log("GATE Updated successfully.");
		}, 1000 * 20);
		setTimeout(updateGate, 1000 * 60 * 5);
	};
	updateGate();
};

export const config = {
	dbName: "GATE_UPDATER",
	displayName: "Gate Updater",
};
