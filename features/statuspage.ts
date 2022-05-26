import axios from "axios";
import { Client } from "discord.js";

export default (client: Client): void  => {
	const updateStatus = async () => {
		// This function is called every 1 minutes and pings the network status page for uptime monitoring
		await axios.get(`https://${process.env.UPTIME_KUMA_MONITOR_DOMAIN}/api/push/${process.env.UPTIME_KUMA_MONITOR_ID}?msg=OK&ping=${client.ws.ping}`);
		console.log(`Posted stats to ${process.env.UPTIME_KUMA_MONITOR_DOMAIN}`);
		setTimeout(updateStatus, 1000 * 60);
	};
	updateStatus()
		.catch(err => console.log(err));
};

export const config = {
	dbName: "STATUSPAGE_UPDATE",
	displayName: "Status Page Update",
};
