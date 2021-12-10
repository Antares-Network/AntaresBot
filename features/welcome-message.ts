import { Client, TextChannel } from "discord.js";
import piiModel from "../models/pii";

export default (client: Client) => {
	client.on("guildMemberAdd", async (member) => {
		const res = await piiModel.findOne({ GUILD_NAME: member.guild.name });
		let welcomeMessage = res?.WELCOME_MESSAGE;
		if (res.GUILD_WELCOME_ENABLED === false) {
			return;
		} else {
			const channel = member.guild.channels.cache.find(res.GUILD_WELCOME_CHANNEL) as TextChannel;
			if (!channel) {
				return;
			} else {
				welcomeMessage = welcomeMessage.replace(/{USER}/g, `<@${member.user.username}>`);
				welcomeMessage = welcomeMessage.replace(/{SERVER_NAME}/g, member.guild.name);
				welcomeMessage = welcomeMessage.replace(/{NEXT_CHANNEL}/g, `<#${res?.GUILD_WELCOME_NEXT_CHANNEL}>`);
				channel.send(welcomeMessage).then((msg) => {
					setTimeout(() => msg.delete(), 1000 * 10);
				});
			}
		}
	});
};

export const config = {
	dbName: "GUILD_MEMBER_WELCOME",
	displayName: "Guild Member Welcome",
};
