import { Client } from "discord.js";
import gateModel from "../models/gate";


export default async (client: Client) => {
	const doc = await gateModel.findOne({ NAME: "GATE" });

	const statusOptions = [
		`/help | V.${process.env.VERSION}`,
		`/help | ${doc.TOTAL_SERVERS} Servers`,
		`/help | playantares.com`,
		`/help | ${doc.TOTAL_SERVERS} Servers`,
		`/help | nathen418.com`,
		`/help | ${doc.TOTAL_SERVERS} Servers`,
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
