// import { TextChannel } from "discord.js";
// import { ICommand } from "wokcommands";
// import DiscordJS from "discord.js";

// export default {
//   category: "admin",
//   description: "Makes the bot say something",
//   slash: false,
//   expectedArgs: "<content> <channel>",
//   minArgs: 1,
//   permissions: ["MANAGE_MESSAGES"],
//   guildOnly: true,
//   options: [
//     {
//       name: "content",
//       description: "What to say",
//       type: DiscordJS.Constants.ApplicationCommandOptionTypes.CHANNEL,
//       required: true,
//     },
// 		{
// 			name: "channel",
// 			description: "The channel to say the thing in",
// 			type: DiscordJS.Constants.ApplicationCommandOptionTypes.CHANNEL,
// 			required: false,
// 		}
// 	],

//   callback: ({ client, interaction}) => {

//     const chan = client.channels.cache.get(args) as TextChannel;
//     if (id) {
//       const mentionedChannel = client.channels.cache.get(id) as TextChannel;
//       mentionedChannel.send(text.replace(args[0], ""))
//     } else {
//       channel.send(text)
//     }
//   }
// } as ICommand;
