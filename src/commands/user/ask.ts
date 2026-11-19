import { Command } from "@sapphire/framework";
import { escapeMarkdown } from "discord.js";
import { registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { pick } from "../../lib/util.js";

export const EIGHT_BALL = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",
  "Reply hazy try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
  "No way.",
  "Maybe",
  "The answer is hiding inside you",
  "No.",
  "Depends on the mood of the CS god",
  "Hang on",
  "It's over",
  "It's just the beginning",
  "Good Luck",
] as const;

export class AskCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: "Answers all of the questions you might have",
      preconditions: ["BotChannel"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b.addStringOption((o) =>
        o.setName("question").setDescription("Your burning question").setRequired(true).setMaxLength(1000),
      ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const user = interaction.user;
    const question = escapeMarkdown(interaction.options.getString("question", true));
    const name = escapeMarkdown(user.username);
    await interaction.reply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle(`${user.username} has a burning question`.slice(0, 256))
          .setThumbnail(user.displayAvatarURL())
          .setDescription(`${name} asks:\n${question}\n\n**My Answer:**\n${pick(EIGHT_BALL)}`),
      ],
    });
  }
}
