import { Client } from "discord.js";

export default async (client: Client) => {
	const statusOptions = [
		`/help | V.${process.env.VERSION}`,
		`/help | ${(await client.guilds.fetch()).size} Servers`,
		`/help | playantares.com`,
		`/help | ${(await client.guilds.fetch()).size} Servers`,
		`/help | nathen418.com`,
		`/help | ${(await client.guilds.fetch()).size} Servers`,
		`/help | status.playantares.com`,
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
