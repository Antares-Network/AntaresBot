import { MessageEmbed } from "discord.js";
import { ICommand } from "wokcommands";

export default {
  name: "help",
  category: "user",
  description: "Shows the bot help embed",
  slash: false,
  guildOnly: true,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: ({ client }) => {
    const Embed = new MessageEmbed()
      .setColor("#ff3505")
      .setURL("https://dsc.gg/antaresnetwork")
      .setTitle("Help, a list of commands")
      .setDescription(
        "**8ball** or **ask**: Ask the bot a question and have it respond" +
          "\n**random**: ❗❗ DISABLED ❗❗" +
          "\n**cat**: Sends a random picture of a cat." +
          "\n**dog**: Sends a random picture of a dog." +
          "\n**xkcd** or **comic**: Sends a random XKCD comic" +
          "\n**flip**: Flips a coin." +
          "\n**roll**: Rolls a die" +
          "\n**sneeze**: Makes the bot sneeze lol." +
          "\n**reddit** or **meme**: ❗❗Only available in NSFW channels for now❗❗" +
          "\n**github**: Sends an embed with a link to the github repo for the bot." +
          "\n**ping**: Sends the ping time of the bot." +
          "\n**stats** and **update**: Updates the database and shows the bots most recent stats." +
          "\n**uptime**: Sends the uptime of the bot" +
          "\n**counting**: In admin help. Creates a server counting channel" +
          "\n**invite**: Sends an invite for the bot and the support server." +
          "\n**suggest**: Sends a suggestion to the bot developer." +
          "\n**prefix**: Shows the Prefix for the bot." +
          "\n**adminhelp**: Sends the help page with admin commands." +
          "\n**privacy**: Sends in a dm, the privacy policy for the bot." +
          "\nJoin our support server: https://dsc.gg/antaresnetwork" +
          "Invite Antares Bot today: [Click Me!](https://discord.com/oauth2/authorize?client_id=736086156759924762&permissions=388177&scope=bot%20applications.commands)"
      )
      .setFooter(
        `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
        "https://playantares.com/resources/icon.png"
      );
    return Embed;
  },
} as ICommand;
