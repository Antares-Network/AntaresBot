import { ICommand } from "wokcommands";

export default {
	name: "update",
	category: "user",
	description: "Depreciated, Please use `/stats` instead",
	slash: true,
	guildOnly: true,
	testOnly: false,
	requiredPermissions: ["SEND_MESSAGES"],

	callback: async ({ interaction }) => {
		interaction.reply({
			content: `This command has been depreciated and will be removed in a future release.\n You can now just use \`/stats\` and it will update automatically.`,
			ephemeral: true,
		  });
	},
} as ICommand;
