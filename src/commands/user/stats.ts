import { Command } from "@sapphire/framework";
import { time } from "discord.js";
import { registerGuildCommand } from "../../lib/commands.js";
import { ICON_URL, STATS_PAGE_URL } from "../../lib/constants.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getBotStats } from "../../lib/services/stats.js";

export class StatsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Sends an embed with some fun bot stats", preconditions: ["BotChannel"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const doc = await getBotStats();
    const n = (v: number | undefined) => (v ?? 0).toLocaleString("en-US");
    await interaction.reply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("Fun Bot Stats!")
          .setThumbnail(ICON_URL)
          .setDescription(`Stats refresh automatically every 5 minutes.\nCheck out our [Stats Page](${STATS_PAGE_URL})`)
          .addFields(
            { name: "This guild's Member Count:", value: n(interaction.guild?.memberCount) },
            { name: "Total Bot users:", value: n(doc.totalUsers) },
            { name: "Total servers the bot is in:", value: n(doc.totalServers) },
            { name: "Total messages everyone has sent to the bot:", value: n(doc.totalMessages) },
            { name: "Last update time:", value: doc.updatedAt ? time(doc.updatedAt, "R") : "Never" },
          ),
      ],
    });
  }
}
