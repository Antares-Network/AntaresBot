import { TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import DiscordJS from "discord.js";

export default {
  category: "admin",
  description: "Makes the bot say something",
  slash: true,
  expectedArgs: "<content> <channel>",
  minArgs: 1,
  permissions: ["MANAGE_MESSAGES"],
  guildOnly: true,
  options: [
    {
      name: "content",
      description: "What to say",
      type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
      required: true,
    },
	{
		name: "channel",
		description: "The channel to say the thing in",
		type: DiscordJS.Constants.ApplicationCommandOptionTypes.CHANNEL,
		required: false,
	}
	],

  callback: ({ interaction }) => {
    const content = interaction.options.getString("content") as string;
    const channel = interaction.options.getChannel("channel") as TextChannel || interaction.channel as TextChannel;
    if (!content) {
        interaction.reply({ content: "You need to provide a content to say", ephemeral: true });
        return;
    }
    channel.send(content);
    interaction.reply({ content: `Message sent in <#${channel.id}>`, ephemeral: true });
  }
} as ICommand;
