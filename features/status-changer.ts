import { Client } from "discord.js";

export default (client: Client) => {
	const statusOptions = [
		`${process.env.BOT_DEFAULT_PREFIX}help | V.${process.env.VERSION}`,
		`${process.env.BOT_DEFAULT_PREFIX}help | ${client.guilds.cache.size} Servers`,
		`${process.env.BOT_DEFAULT_PREFIX}help | V.${process.env.VERSION}`,
		`${process.env.BOT_DEFAULT_PREFIX}help | playantares.com`,
		`${process.env.BOT_DEFAULT_PREFIX}help | V.${process.env.VERSION}`,
		`${process.env.BOT_DEFAULT_PREFIX}help | nathen418.com`,
	];
	let counter = 0;

	const updateStatus = () => {
		client.user?.setPresence({
			status: "online",
			activities: [
				{
					name: statusOptions[counter],
					type: "PLAYING",
				},
			],
		});

		if (++counter >= statusOptions.length) {
			counter = 0;
		}

		setTimeout(updateStatus, 1000 * 60 * 5);
	};
	updateStatus();
};

export const config = {
	dbName: "STATUS_CHANGER",
	displayName: "Status Changer",
};
