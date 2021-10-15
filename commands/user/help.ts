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
          "\n**flip**: Flips a coin." +
          "\n**dog**: Sends a random picture of a dog." +
          "\n**roll**: Rolls a die" +
          "\n**sneeze**: Makes the bot sneeze lol." +
          "\n**stats** and **update**: Updates the database and shows the bots most recent stats." +
          "\n**reddit** or **meme**: Sends a funny meme from reddit" +
          "\n**xkcd** or **comic**: Sends a random XKCD comic" +
          "\n**github**: Sends an embed with a link to the github repo for the bot." +
          "\n**prefix**: Shows the Prefix for the bot." +
          "\n**invite**: Sends an invite for the bot and the support server." +
          "\n**ping**: Sends the ping time of the bot." +
          "\n**uptime**: Sends the uptime of the bot" +
          "\n**privacy**: Sends in a dm, the privacy policy for the bot." +
          "\n**suggest**: Sends a suggestion to the bot developer." +
          "\n**counting**: In admin help. Creates a server counting channel" +
          "\n**adminhelp**: Sends the help page with admin commands." +
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
