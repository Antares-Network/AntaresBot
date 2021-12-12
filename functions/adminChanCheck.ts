import { Client, TextChannel, CommandInteraction, User } from "discord.js";
import piiModel from "../models/pii";

async function check(interaction: CommandInteraction, channel: TextChannel): Promise<boolean> {
	const srv = await piiModel.findOne({ GUILD_ID: channel.guild?.id }); //find the entry for the guild
	//check if admin commands were sent in the admin channel
	if (channel.id != srv.GUILD_ADMIN_CHANNEL) {
		if (srv.GUILD_ADMIN_CHANNEL === null) {
			interaction.reply(
				`The server owner has not set an admin channel yet.\n If you are the server owner please use \`${process.env.BOT_DEFAULT_PREFIX}admin #channel\``
			);
			return Promise.resolve(false); //exit the loop and don't parse the command
		} else {
			// Let the admin know that they tried to use a command in the wrong channel
			await interaction.reply({
				content: `You can only use this command in <#${srv.GUILD_ADMIN_CHANNEL}>`,
				ephemeral: true,
			});
			return Promise.resolve(false);
		}
	}
	return Promise.resolve(true);
}
export = { check };
