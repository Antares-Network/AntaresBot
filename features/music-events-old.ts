// import { Client, TextChannel, MessageEmbed, MessageComponentInteraction, MessageActionRow, MessageButton, Interaction } from "discord.js";
// import piiModel from "../models/pii";
// import { player } from "../index";

// export default (client: Client) => {
// 	// Emitted when a song was added to the queue.
// 	player.on("songAdd", async (queue, song) => {
// 		const description = `**Author:** ${song.author}\n **Duration:** ${song.duration}`;
// 		const srv = await piiModel.findOne({ GUILD_ID: queue.guild?.id });
// 		const channel = queue.guild.channels.cache.get(srv.GUILD_MUSIC_CHANNEL) as TextChannel;
// 		const embed = new MessageEmbed()
// 			.setTitle(String(song.name))
// 			.setURL(String(song.url))
// 			.setDescription(description)
// 			.setColor("#ff3505")
// 			.setThumbnail(String(queue?.nowPlaying?.thumbnail))
// 			.setFooter({text:
// 				`Requested by ${song.requestedBy} | Antares Bot | ${process.env.VERSION}`, iconURL:
// 				"https://playantares.com/resources/icon.png"
// 			});
// 		channel.send({ embeds: [embed] });
// 	});


// 	// Emitted when a playlist was added to the queue.
// 	player.on("playlistAdd", async (queue, playlist) => {
// 		const description = `**Author:** ${playlist.author}\n **Songs:** ${playlist.songs}`;
// 		const contentsDescription = playlist.songs.map((song) => `**${song.name}**`).join("\n");
// 		const srv = await piiModel.findOne({ GUILD_ID: queue.guild?.id });
// 		const channel = queue.guild.channels.cache.get(srv.GUILD_MUSIC_CHANNEL) as TextChannel;

// 		//buttons
// 		const row = new MessageActionRow()
//       		.addComponents(
//         		new MessageButton()
//           			.setCustomId("list")
//           			.setEmoji("📃")
//           			.setLabel("See Song List")
//           			.setStyle("SUCCESS")
// 			);

// 		const embed = new MessageEmbed()
// 			.setTitle(String(playlist.name))
// 			.setURL(String(playlist.url))
// 			.setDescription(description)
// 			.setColor("#ff3505")
// 			.setThumbnail(String(queue?.nowPlaying?.thumbnail))
// 			.setFooter({text:
// 				`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
// 				"https://playantares.com/resources/icon.png"
// 			  });
		
// 		const contentsEmbed = new MessageEmbed()
// 			.setTitle(String(playlist.name))
// 			.setURL(String(playlist.url))
// 			.setDescription(contentsDescription)
// 			.setColor("#ff3505")
// 			.setFooter({text:
// 				`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
// 				"https://playantares.com/resources/icon.png"
// 			  });

// 		channel.send({ embeds: [embed] });
// 		const filter = (btnInt: Interaction) => {
// 			return true;
// 		};
// 		const collector = channel.createMessageComponentCollector({
// 			filter,
// 		});
// 		collector.on("collect", (i: MessageComponentInteraction) => {
// 		if (i.customId === "images") {
// 		  i.reply({ embeds: [contentsEmbed] }).then(() => {
// 			setTimeout(() => {
// 			  i.deleteReply();
// 			}, 1000 * 120);
// 		  });
// 		}
// 		});
// 	});



// 	// Emitted when there was no more music to play.
// 	player.on("queueDestroyed", (queue) => {

// 	});

// 	// Emitted when the queue was destroyed (either by ending or stopping).
// 	player.on("queueEnd", async (queue) => {
// 		const description = `The queue has ended, there are no more songs left.`;
// 		const srv = await piiModel.findOne({ GUILD_ID: queue.guild?.id });
// 		const channel = queue.guild.channels.cache.get(srv.GUILD_MUSIC_CHANNEL) as TextChannel;
// 		const embed = new MessageEmbed()
// 			.setTitle("Queue Ended")
// 			.setDescription(description)
// 			.setColor("#ff3505")
// 			.setFooter({text:
// 				`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
// 				"https://playantares.com/resources/icon.png"
// 			  });
// 		channel.send({ embeds: [embed] });

// 	});


// 	// Emitted when a song changed.
// 	player.on("songChanged", async (queue, newSong, oldSong) => {
// 		const description = `**Author:** ${newSong.author}\n **Duration:** ${newSong.duration}`;
// 		const srv = await piiModel.findOne({ GUILD_ID: queue.guild?.id });
// 		const channel = queue.guild.channels.cache.get(srv.GUILD_DEFAULT_CHANNEL) as TextChannel;
// 		const embed = new MessageEmbed()
// 			.setTitle(String(newSong.name))
// 			.setURL(String(newSong.url))
// 			.setDescription(description)
// 			.setColor(0x00ff00)
// 			.setThumbnail(String(newSong.thumbnail));
// 		channel.send({ embeds: [embed] });
// 	});


// 	// Emitted when a first song in the queue started playing.
// 	player.on("songFirst", async (queue, song) => {
// 		const description = `**Author:** ${queue?.nowPlaying?.author}\n **Duration:** ${queue?.nowPlaying?.duration}`;
// 		const srv = await piiModel.findOne({ GUILD_ID: queue.guild?.id });
// 		const embed = new MessageEmbed()
// 			.setTitle(String(queue?.nowPlaying?.name))
// 			.setURL(String(queue?.nowPlaying?.url))
// 			.setDescription(description)
// 			.setColor(0x00ff00)
// 			.setThumbnail(String(queue?.nowPlaying?.thumbnail));
// 		const channel = queue.guild.channels.cache.get(srv.GUILD_DEFAULT_CHANNEL) as TextChannel;
// 		channel.send({ embeds: [embed] });
// 	});


// 	// Emitted when someone disconnected the bot from the channel.
// 	player.on("clientDisconnect", (queue) => {
// 		console.log(`I was kicked from the Voice Channel, queue ended.`);
// 	});


// 	// Emitted when deafenOnJoin is true and the bot was undeafened
// 	player.on("clientUndeafen", (queue) => {
// 		console.log(`I got undefeanded.`);
// 	});


// 	// Emitted when there was an error in runtime
// 	player.on("error", async (error, queue) => {
// 		const description = `There was an error. Please try again.`;
// 		const srv = await piiModel.findOne({ GUILD_ID: queue.guild?.id });
// 		const channel = queue.guild.channels.cache.get(srv.GUILD_MUSIC_CHANNEL) as TextChannel;
// 		const embed = new MessageEmbed()
// 			.setTitle("Error")
// 			.setDescription(description)
// 			.setColor("#ff3505")
// 			.setFooter({text:
// 				`Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
// 				"https://playantares.com/resources/icon.png"
// 			  });
// 		channel.send({ embeds: [embed] });
// 	});
// };

// export const config = {
// 	dbName: "Music-Events",
// 	displayName: "Handle music events",
// };
