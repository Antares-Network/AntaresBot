import { Client } from "discord.js";

export default (client: Client) => {
	const statusOptions = [
		`/help | V.${process.env.VERSION}`,
		`/help | ${client.guilds.cache.size} Servers`,
		`/help | V.${process.env.VERSION}`,
		`/help | playantares.com`,
		`/help | V.${process.env.VERSION}`,
		`/help | nathen418.com`,
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
