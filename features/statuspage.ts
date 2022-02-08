import axios from "axios";
import { Client } from "discord.js";

export default async (client: Client) => {
	const updateStatus = () => {
		axios.get(`https://status.playantares.com/api/push/${process.env.STATUSPAGE_KEY}?msg=OK&ping=${client.ws.ping}`);
		console.log(`Posted stats to status.playantares.com`);
		setTimeout(updateStatus, 1000 * 60);
	};
	updateStatus();
};

export const config = {
	dbName: "STATUSPAGE_UPDATE",
	displayName: "Status Page Update",
};
