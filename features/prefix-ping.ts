import { Client } from "discord.js";
import WOKCommands from "wokcommands";

export default (client: Client, instance: WOKCommands) => {
	client.on("messageCreate", async (message) => {
		if (message.member?.user.bot) return;
		if (message.author.bot) return;
		if (message.content === `<@!${client.user?.id}>`) {
			const prefix = instance.getPrefix(message.guild) || instance.defaultPrefix;
			message.reply(`My prefix in this server is ${prefix}\n **ALL USER COMMANDS HAVE NOW BEEN MIGRATED TO SLASH COMMANDS**`);
		}
	});
};

export const config = {
	dbName: "PREFIX_PING",
	displayName: "Prefix Ping",
};
