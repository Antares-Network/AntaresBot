import { Client, TextChannel, MessageEmbed } from "discord.js";
import piiModel from "../models/pii";
import { player } from "../index";

export default (client: Client) => {
	// Emitted when a song was added to the queue.
	player.on("songAdd", async (queue, song) => {
		const description = `**Author:** ${song.author}\n **Duration:** ${song.duration}`;
		const srv = await piiModel.findOne({ GUILD_ID: queue.guild?.id });
		const channel = queue.guild.channels.cache.get(srv.GUILD_DEFAULT_CHANNEL) as TextChannel;
		const embed = new MessageEmbed()
			.setTitle(String(song.name))
			.setURL(String(song.url))
			.setDescription(description)
			.setColor(0x00ff00)
			.setThumbnail(String(queue?.nowPlaying?.thumbnail));
		channel.send({ embeds: [embed] });
	});
	// Emitted when a playlist was added to the queue.
	player.on("playlistAdd", async (queue, playlist) => {
		const description = `**Author:** ${playlist.author}\n **Songs:** ${playlist.songs}`;
		const srv = await piiModel.findOne({ GUILD_ID: queue.guild?.id });
		const channel = queue.guild.channels.cache.get(srv.GUILD_DEFAULT_CHANNEL) as TextChannel;
		const embed = new MessageEmbed()
			.setTitle(String(playlist.name))
			.setURL(String(playlist.url))
			.setDescription(description)
			.setColor(0x00ff00)
			.setThumbnail(String(queue?.nowPlaying?.thumbnail));
		channel.send({ embeds: [embed] });
	});
	// Emitted when there was no more music to play.
	player.on("queueDestroyed", (queue) => console.log(`The queue was destroyed.`));
	// Emitted when the queue was destroyed (either by ending or stopping).
	player.on("queueEnd", (queue) => {
		
	});
	// Emitted when a song changed.
	player.on("songChanged", async (queue, newSong, oldSong) => {
		const description = `**Author:** ${queue?.nowPlaying?.author}\n **Duration:** ${queue?.nowPlaying?.duration}`;
		const srv = await piiModel.findOne({ GUILD_ID: queue.guild?.id });
		const channel = queue.guild.channels.cache.get(srv.GUILD_DEFAULT_CHANNEL) as TextChannel;
		const embed = new MessageEmbed()
			.setTitle(String(queue?.nowPlaying?.name))
			.setURL(String(queue?.nowPlaying?.url))
			.setDescription(description)
			.setColor(0x00ff00)
			.setThumbnail(String(queue?.nowPlaying?.thumbnail));
		channel.send({ embeds: [embed] });
	});
	// Emitted when a first song in the queue started playing.
	player.on("songFirst", async (queue, song) => {
		const description = `**Author:** ${queue?.nowPlaying?.author}\n **Duration:** ${queue?.nowPlaying?.duration}`;
		const srv = await piiModel.findOne({ GUILD_ID: queue.guild?.id });
		const embed = new MessageEmbed()
			.setTitle(String(queue?.nowPlaying?.name))
			.setURL(String(queue?.nowPlaying?.url))
			.setDescription(description)
			.setColor(0x00ff00)
			.setThumbnail(String(queue?.nowPlaying?.thumbnail));
		const channel = queue.guild.channels.cache.get(srv.GUILD_DEFAULT_CHANNEL) as TextChannel;
		channel.send({ embeds: [embed] });
	});
	// Emitted when someone disconnected the bot from the channel.
	player.on("clientDisconnect", (queue) => {
		console.log(`I was kicked from the Voice Channel, queue ended.`);
	});
	// Emitted when deafenOnJoin is true and the bot was undeafened
	player.on("clientUndeafen", (queue) => {
		console.log(`I got undefeanded.`);
	});
	// Emitted when there was an error in runtime
	player.on("error", (error, queue) => {
		console.log(`Error: ${error} in ${queue.guild.name}`);
	});
};

export const config = {
	dbName: "Music-Events",
	displayName: "Handle music events",
};
