import DiscordJS from "discord.js";
import { ICommand } from "wokcommands";
import piiModel from "../../models/pii";

export default {
	category: "admin",
	description: "Setup command for the default bot channel",
	slash: true,
	guildOnly: true,
	testOnly: true,
	permissions: ["MANAGE_GUILD", "MANAGE_CHANNELS"],
	options: [
		{
			name: "type",
			description: "default, admin, music",
			type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
			required: true,
		},
		{
			name: "channel",
			description: "The channel to setup",
			type: DiscordJS.Constants.ApplicationCommandOptionTypes.CHANNEL,
			required: true,
		},
	],

	callback: async ({ interaction, args }) => {
		const req = await piiModel.findOne({ GUILD_ID: interaction.guild?.id });
		if (args[0].toLowerCase() === "default") {
			const doc = await piiModel.findOneAndUpdate(
				{ GUILD_ID: interaction.guild?.id },
				{
					$set: {
						GUILD_DEFAULT_CHANNEL: interaction.options.getChannel("channel"),
					},
				},
				{ new: true }
			);
			interaction.reply(`Set the default channel to <#${doc.GUILD_DEFAULT_CHANNEL}>`);
			await doc.save();
		} else if (args[0].toLowerCase() === "admin") {
			const doc = await piiModel.findOneAndUpdate(
				{ GUILD_ID: interaction.guild?.id },
				{
					$set: { GUILD_ADMIN_CHANNEL: interaction.options.getChannel("channel") },
				},
				{ new: true }
			);
			interaction.reply(`Set the admin channel to <#${doc.GUILD_ADMIN_CHANNEL}>`);
			await doc.save();
		} else if (args[0].toLowerCase() === "music") {
			const doc = await piiModel.findOneAndUpdate(
				{ GUILD_ID: interaction.guild?.id },
				{
					$set: { GUILD_MUSIC_CHANNEL: interaction.options.getChannel("channel") },
				},
				{ new: true }
			);
			interaction.reply(`Set the music channel to <#${doc.GUILD_MUSIC_CHANNEL}>`);
			await doc.save();
        } else {
			interaction.reply("Invalid type.\nYou need to specify either default, admin, or music as the channel type to setup with this command.");
		}
	},
} as ICommand;
