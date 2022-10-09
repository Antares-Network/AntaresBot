import { MessageEmbed, TextChannel } from "discord.js";
import { ICommand } from "wokcommands";
import check from "../../functions/channelCheck";
import { statcord } from "../../index";

export default {
  name: "seasonbot",
  category: "user",
  description:
    "Sends an embed with a link to the most recent Season Bot season",
  slash: true,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: async ({ client, interaction }) => {
    // Command information
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;

    // Embed values
    const color = "#ff3505";
    const url = "https://seasonbot.antaresnetwork.com";
    const thumbnail = "https://antaresnetwork.com/resources/boobot2022.png";
    const title = "Invite Boo Bot today!";
    const fields = [
      {
        name: "**IT'S GONNA BE A SCREAM**",
        value:
          "The scariest time of the year has arrived\nEnjoy the spooky seasonal fun with Boo Bot!",
      },
      {
        name: "🎃**Trick or Treat?**👻",
        value:
          "Get candy, scare your friends, play along and lift your spirit to the top of the leaderboard to win\nWe know you're dying to have some spooktacular fun!",
      },
      {
        name: "⭐Premium Features ⭐",
        value:
          "Go Premium and unlock the spooky fun with Boo Bot! Here's what you get:" +
          "\n\n🔸 Automatic drops by chat activity and the opportunity to fly away with The Witch (which will give you more candies" +
          "Otherwise you'd have to type in a command to make our spooky friends appear." +
          "\n🔸More Fun commands: Including find, fly, rip and haunt that will let everyone in your server get more candies!" +
          "\n🔸 More control: Give or remove candies, give or remove poisoned candies, change bot's prefix and change for how long the drops stay visible and disable commands." +
          "\n🔸 Get dedicated and personalized help in our Support Server straight from the Dev!",
      },
      { name: "Visit the website", value: url },
      { name: "Invite Boo Bot", value: "https://dsc.gg/seasonbot" },
    ];
    const footer = `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`;
    const footerIcon = "https://antaresnetwork.com/resources/icon.png";

    // Embed construction
    const Embed = new MessageEmbed()
      .setColor(color)
      .setURL(url)
      .setTitle(title)
      .setThumbnail(thumbnail)
      .setFields(fields)
      .setFooter({text: footer, iconURL: footerIcon});

    // Post command usage
    statcord.postCommand("seasonbot", id);

    // Return the embed after the channel is checked
    if (await check.check(interaction, chan)) return Embed;
  },
} as ICommand;
