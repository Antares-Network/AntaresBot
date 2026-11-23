import { Command } from "@sapphire/framework";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { activeGame, startScramble } from "../../lib/services/games.js";

export class ScrambleCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: "Unscramble the word. First to type it wins!",
      preconditions: ["BotChannel"],
      cooldownDelay: 15_000,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild() || !interaction.channel?.isSendable()) return;
    if (activeGame(interaction.channelId)) {
      await interaction.reply({ content: "A game is already running in this channel!", flags: ephemeral });
      return;
    }
    const { scrambled } = startScramble(interaction.channel);
    await interaction.reply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("🔀 Scramble")
          .setDescription(`Unscramble this word:\n# \`${scrambled.toUpperCase()}\``)
          .setFooter({ text: "Type the word in chat. 45 seconds!" }),
      ],
    });
  }
}
