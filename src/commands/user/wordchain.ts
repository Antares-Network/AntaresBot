import { Command } from "@sapphire/framework";
import { PermissionFlagsBits } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { activeGame, startWordChain } from "../../lib/services/games.js";

export class WordChainCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Play word chain: each word starts with the last letter of the previous one", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b
        .addSubcommand((s) => s.setName("start").setDescription("Start a word chain in this channel"))
        .addSubcommand((s) => s.setName("stop").setDescription("End the current word chain")),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild() || !interaction.channel?.isSendable()) return;
    const game = activeGame(interaction.channelId);

    if (interaction.options.getSubcommand() === "stop") {
      if (game?.kind !== "wordchain") {
        await interaction.reply({ content: "No word chain is running here.", flags: ephemeral });
        return;
      }
      await interaction.reply({ content: "Stopping the word chain…", flags: ephemeral });
      await game.stop("stopped");
      return;
    }

    if (game) {
      await interaction.reply({ content: "A game is already running in this channel!", flags: ephemeral });
      return;
    }
    if (!interaction.appPermissions.has(PermissionFlagsBits.AddReactions)) {
      await interaction.reply({ content: "I need the Add Reactions permission here to run word chain.", flags: ephemeral });
      return;
    }
    const { letter } = startWordChain(interaction.channel);
    await interaction.reply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("🔗 Word chain")
          .setDescription(
            `Type a word starting with **${letter.toUpperCase()}**. Each next word must start with the last letter of the previous one.\n\n` +
              "• Real English words, 3+ letters\n• No repeats\n• You can't go twice in a row\n\nThe game ends after 2 minutes without a valid word, or with `/wordchain stop`.",
          ),
      ],
    });
  }
}
