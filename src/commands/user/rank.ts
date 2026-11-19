import { Command } from "@sapphire/framework";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getRank } from "../../lib/services/members.js";
import { getFeatureSettings } from "../../lib/services/settings.js";

function bar(into: number, needed: number, width = 14) {
  const filled = Math.round((into / Math.max(needed, 1)) * width);
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

export class RankCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Show your (or someone's) level and rank in this server", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) => b.addUserOption((o) => o.setName("user").setDescription("Whose rank")));
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    if (!(await getFeatureSettings(interaction.guildId)).levels.enabled) {
      await interaction.reply({ content: "Levels aren't turned on in this server. An admin can enable them with `/config levels enable`.", flags: ephemeral });
      return;
    }
    const user = interaction.options.getUser("user") ?? interaction.user;
    const r = await getRank(interaction.guildId, user.id);
    await interaction.reply({
      allowedMentions: { parse: [] },
      embeds: [
        brandEmbed(interaction.client)
          .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
          .setTitle(`Level ${r.level}${r.rank ? ` · Rank #${r.rank}` : ""}`)
          .setDescription(`${bar(r.into, r.needed)}  ${r.into.toLocaleString("en-US")} / ${r.needed.toLocaleString("en-US")} XP`)
          .addFields(
            { name: "Total XP", value: r.xp.toLocaleString("en-US"), inline: true },
            { name: "Counting", value: `${r.countingCorrect} ✅ / ${r.countingMistakes} ❌`, inline: true },
          ),
      ],
    });
  }
}
