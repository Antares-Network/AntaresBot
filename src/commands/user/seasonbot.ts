import { Command } from "@sapphire/framework";
import { registerGuildCommand } from "../../lib/commands.js";
import { SEASONBOT_URL } from "../../lib/constants.js";
import { brandEmbed } from "../../lib/embeds.js";

export class SeasonBotCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "seasonbot",
      description: "Sends an embed with a link to the most recent Season Bot season",
      preconditions: ["BotChannel"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.reply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("Invite Boo Bot today!")
          .setURL(SEASONBOT_URL)
          .setThumbnail("https://antaresnetwork.com/resources/boobot2022.png")
          .setFields(
            {
              name: "**IT'S GONNA BE A SCREAM**",
              value: "The scariest time of the year has arrived\nEnjoy the spooky seasonal fun with Boo Bot!",
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
                "\n\n🔸 Automatic drops by chat activity and the opportunity to fly away with The Witch (which will give you more candies). " +
                "Otherwise you'd have to type in a command to make our spooky friends appear." +
                "\n🔸More Fun commands: Including find, fly, rip and haunt that will let everyone in your server get more candies!" +
                "\n🔸 More control: Give or remove candies, give or remove poisoned candies, change bot's prefix and change for how long the drops stay visible and disable commands." +
                "\n🔸 Get dedicated and personalized help in our Support Server straight from the Dev!",
            },
            { name: "Visit the website", value: SEASONBOT_URL },
            { name: "Invite Boo Bot", value: "https://dsc.gg/seasonbot" },
          ),
      ],
    });
  }
}
