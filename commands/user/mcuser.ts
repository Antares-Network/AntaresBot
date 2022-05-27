import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import axios, { AxiosResponse } from "axios";
import check from "../../functions/channelCheck";
import { statcord } from "../../index";

export default {
	name: "mcuser",
	category: "user",
	description: "Gets the username, skin and UUID of a valid minecraft username",
	expectedArgs: "<username>",
	minArgs: 1,
	maxArgs: 1,
	slash: true,
	testOnly: false,
	guildOnly: true,
	requiredPermissions: ["SEND_MESSAGES"],
	options: [
		{
			name: "username",
			description: "Any valid Minecraft username",
			required: true,
			type: 3,
		},
	],

	callback: async ({ client, interaction, args }) => {
		// Command information
		const id = interaction.user.id;
		const chan = interaction.channel as TextChannel;

		// Fetched information //! Throws nasty errors. Fix later
		const response = (await axios.get(`https://api.ashcon.app/mojang/v2/user/${args[0]}`).catch((err) => {
			interaction.reply({ content: "The username you entered is invalid. Please try again.", ephemeral: true });
			console.log(err);
			return;
		})) as AxiosResponse;
		const uuid = response.data.uuid;
		let creationDate = response.data.created_at;
		const nameHistory = response.data.username_history.reverse();
		let recentNames = "";

		//processing
		if (creationDate === null) {
			creationDate = "Your account was created before the API started tracking creation dates.";
		}
		for (let i = 0; i < nameHistory.length; i++) {
			if (nameHistory[i] === undefined) {
				recentNames += "None";
			} else {
				if (nameHistory[i].changed_at === undefined) {
					recentNames += `**${i + 1}.** ${nameHistory[i].username}\n`;
				} else {
					recentNames += `**${i + 1}.** ${nameHistory[i].username} Changed at: \`${nameHistory[i].changed_at}\`\n`;
				}
			}
			if (i === 3) break;
		}

		// Embed values
		const color = "#ff3505";
		const title = `${args[0]}'s info`;
		const image = `https://crafatar.com/renders/body/${uuid}?overlay`;
		const description = `**Username:** ${args[0]}\n **UUID:** ${uuid}\n **Approximate Account Creation Date:** ${creationDate}\n **Recent Names:**\n${recentNames}`;
		const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`;
		const footerIcon = "https://playantares.com/resources/icon.png";

		// Embed construction
		const Embed = new MessageEmbed()
		.setColor(color)
		.setTitle(title)
		.setImage(image)
		.setDescription(description)
		.setFooter({text: footer, iconURL: footerIcon});

		// Post command stats
		statcord.postCommand("mcuser", id);

		// Return the embed after the channel is checked
		if (await check.check(interaction, chan)) return Embed;
	},
} as ICommand;
