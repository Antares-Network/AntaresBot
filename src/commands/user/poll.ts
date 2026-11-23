import { Command } from "@sapphire/framework";
import { PermissionFlagsBits } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";

/** Uses Discord's native polls: voting, timers and results are handled by Discord itself. */
export class PollCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Start a poll", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b
        .addStringOption((o) => o.setName("question").setDescription("The question").setRequired(true).setMaxLength(300))
        .addStringOption((o) => o.setName("options").setDescription("Answers separated by | (2–10), e.g. Pizza | Tacos | Sushi").setRequired(true).setMaxLength(600))
        .addIntegerOption((o) => o.setName("hours").setDescription("How long it runs (default 24, max 768)").setMinValue(1).setMaxValue(768))
        .addBooleanOption((o) => o.setName("multiple").setDescription("Allow picking more than one answer")),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const answers = [
      ...new Set(
        interaction.options
          .getString("options", true)
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];
    if (answers.length < 2 || answers.length > 10 || answers.some((a) => a.length > 55)) {
      await interaction.reply({ content: "Give 2–10 different answers separated by `|`, each up to 55 characters.", flags: ephemeral });
      return;
    }
    if (!interaction.appPermissions.has(PermissionFlagsBits.SendPolls)) {
      await interaction.reply({ content: "I need the Create Polls permission here.", flags: ephemeral });
      return;
    }
    await interaction.reply({
      poll: {
        question: { text: interaction.options.getString("question", true) },
        answers: answers.map((text) => ({ text })),
        duration: interaction.options.getInteger("hours") ?? 24,
        allowMultiselect: interaction.options.getBoolean("multiple") ?? false,
      },
      allowedMentions: { parse: [] },
    });
  }
}
