import { Command } from "@sapphire/framework";
import { registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getCountingState, MAX_SAVES } from "../../lib/services/counting.js";
import { leaderboard } from "../../lib/services/members.js";

const MEDALS = ["🥇", "🥈", "🥉"];

export class LeaderboardCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Top members by XP or counting in this server", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b.addStringOption((o) =>
        o
          .setName("board")
          .setDescription("Which leaderboard (default: XP)")
          .addChoices({ name: "XP / levels", value: "xp" }, { name: "Counting", value: "counting" }),
      ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const board = (interaction.options.getString("board") ?? "xp") as "xp" | "counting";
    const rows = await leaderboard(interaction.guildId, board);
    const lines = rows.map((r, i) => {
      const pos = MEDALS[i] ?? `**${i + 1}.**`;
      return board === "xp"
        ? `${pos} <@${r.userId}> · level ${r.level} (${r.xp.toLocaleString("en-US")} XP)`
        : `${pos} <@${r.userId}> · ${r.countingCorrect.toLocaleString("en-US")} counts`;
    });
    const embed = brandEmbed(interaction.client)
      .setTitle(board === "xp" ? `🏆 ${interaction.guild.name}: XP leaderboard` : `🔢 ${interaction.guild.name}: counting leaderboard`)
      .setDescription(lines.join("\n") || "Nobody on the board yet!");
    if (board === "counting") {
      const c = await getCountingState(interaction.guildId);
      embed.addFields(
        { name: "Current", value: c.current.toLocaleString("en-US"), inline: true },
        { name: "High score", value: c.highScore.toLocaleString("en-US"), inline: true },
        { name: "Saves", value: `${c.saves}/${MAX_SAVES}`, inline: true },
      );
    }
    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  }
}
