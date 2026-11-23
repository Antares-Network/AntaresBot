import { Command } from "@sapphire/framework";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { activeGame, fetchTriviaQuestion, startTrivia } from "../../lib/services/games.js";

const LETTERS = ["🇦", "🇧", "🇨", "🇩"];

export class TriviaCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: "A multiple-choice trivia question. First to type the right letter wins!",
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
    await interaction.deferReply();
    const q = await fetchTriviaQuestion();
    if (activeGame(interaction.channelId)) {
      await interaction.editReply("A game started while I was fetching the question. Try again after it ends!");
      return;
    }
    startTrivia(interaction.channel, q);
    await interaction.editReply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("🧠 Trivia")
          .setDescription(`**${q.question}**\n\n${q.options.map((o, i) => `${LETTERS[i]} ${o}`).join("\n")}`)
          .addFields(
            { name: "Category", value: q.category, inline: true },
            { name: "Difficulty", value: q.difficulty, inline: true },
          )
          .setFooter({ text: "Type A, B, C or D (or the answer). One guess each. 30 seconds!" }),
      ],
    });
  }
}
