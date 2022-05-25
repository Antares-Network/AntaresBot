import DiscordJS, { GuildMember, Guild, StageChannel, VoiceChannel } from "discord.js";
import { ICommand } from "wokcommands";
import { statcord, player } from "../../index";

export default {
	name: "play",
	category: "user",
	description: "Plays music in a vc",
	expectedArgs: "<link>",
	minArgs: 1,
	maxArgs: 3,
	slash: true,
	testOnly: true,
	guildOnly: true,
	requiredPermissions: ["SEND_MESSAGES"],
	options: [
		{
			name: "link",
			description: "The link to the song or playlist you wish to add to the queue",
			type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
			required: true,
		},
	],

	callback: async ({ interaction, args }) => {
		interaction.deferReply();
		const link = args[0];
		const id = interaction.guild?.id as string;
		const member = interaction.member as GuildMember;
		const guild = interaction.guild as Guild;
		const queue = player.queue(guild);
		await queue.join(member.voice.channel as VoiceChannel | StageChannel);

		if (link.includes("youtube" || "youtu.be" || "yt.be")) {
			const status = await queue.play(link);
			if (!status) {
				interaction.followUp("The song could not be found");
			} else {
				interaction.followUp("The requested song is being played");
			}
		} else if (link.includes("spotify")) {
			const status = await queue.spotify(link);
			if (!status) {
				interaction.followUp("The spotify song/playlist could not be found");
			} else {
				interaction.followUp("The requested spotify song/playlist is being played");
			}
		}

		statcord.postCommand("play", id);

	},
} as ICommand;
