import {
  MessageEmbed,
  Guild,
  GuildMember,
  StageChannel,
  VoiceChannel,
} from "discord.js";
import { ICommand } from "wokcommands";
import { player } from "../../index";
const { RepeatMode } = require("discord-music-player");

export default {
  name: "music",
  category: "user",
  description: "Starts playlist music",
  expectedArgs: "<action> <link>",
  minArgs: 1,
  maxArgs: 2,
  slash: true,
  testOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ interaction, args }) => {
    let command = args[0];
    let id = interaction.guild?.id as string;
    let member = interaction.member as GuildMember;
    let guildQueue = player.getQueue(id);
    if (command === "play") {
      interaction.deferReply();
      let queue = player.createQueue(String(interaction.guild?.id));
      await queue.join(member.voice.channel as VoiceChannel | StageChannel);
      let song = await queue.play(args.join(" ")).catch((_) => {
        if (!guildQueue) queue.stop();
      });
      interaction.followUp(`The link you sent was added to the queue.`);
    }
    if (guildQueue) {
      if (command === "skip") {
        guildQueue.skip();
        interaction.reply("Skipped the current song!");
      }

      if (command === "stop") {
        guildQueue.stop();
        interaction.reply("Stopped the music!");
      }

      if (command === "removeLoop") {
        guildQueue.setRepeatMode(RepeatMode.DISABLED); // or 0 instead of RepeatMode.DISABLED
        interaction.reply("Removed the loop!");
      }

      if (command === "toggleLoop") {
        guildQueue.setRepeatMode(RepeatMode.SONG); // or 1 instead of RepeatMode.SONG
        interaction.reply("Toggled the loop!");
      }

      if (command === "toggleQueueLoop") {
        guildQueue.setRepeatMode(RepeatMode.QUEUE); // or 2 instead of RepeatMode.QUEUE
        interaction.reply("Toggled the queue loop!");
      }

      if (command === "setVolume") {
        guildQueue.setVolume(parseInt(args[1]));
        interaction.reply("Set the volume to " + args[1] + "!");
      }

      if (command === "seek") {
        guildQueue.seek(parseInt(args[1]) * 1000);
        interaction.reply("Seeked to " + Number(args[1]) * 1000 + "!");
      }

      if (command === "clearQueue") {
        guildQueue.clearQueue();
        interaction.reply("Cleared the queue!");
      }

      if (command === "shuffle") {
        guildQueue.shuffle();
        interaction.reply("Shuffled the queue!");
      }
      if (command === "getQueue") {
        console.log(guildQueue);
        interaction.reply("Here is the queue!\n " + guildQueue);
      }

      if (command === "getVolume") {
        console.log(guildQueue.volume);
        interaction.reply("The volume is " + guildQueue.volume + "!");
      }

      if (command === "nowPlaying") {
        console.log(`Now playing: ${guildQueue.nowPlaying}`);
        interaction.reply("Now playing: " + guildQueue.nowPlaying);
      }

      if (command === "pause") {
        guildQueue.setPaused(true);
        interaction.reply("Paused the music!");
      }

      if (command === "resume") {
        guildQueue.setPaused(false);
        interaction.reply("Resumed the music!");
      }

      if (command === "remove") {
        guildQueue.remove(parseInt(args[1]));
        interaction.reply("Removed the song!");
      }

      if (command === "createProgressBar") {
        const ProgressBar = guildQueue.createProgressBar();

        // [======>              ][00:35/2:20]
        console.log(ProgressBar.prettier);
        interaction.reply(
          "Here is the progress bar!\n " + ProgressBar.prettier
        );
      }
    }
  },
} as ICommand;
