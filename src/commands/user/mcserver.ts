import { Command } from "@sapphire/framework";
import { escapeMarkdown } from "discord.js";
import { registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { McPingError, pingMinecraft } from "../../lib/services/mcStatus.js";

export class McServerCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "mcserver",
      description: "Check whether a Minecraft Java server is online and who's playing",
      preconditions: ["BotChannel"],
      cooldownDelay: 10_000,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b.addStringOption((o) =>
        o.setName("address").setDescription("e.g. play.example.com or play.example.com:25566").setRequired(true).setMaxLength(260),
      ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const address = interaction.options.getString("address", true);
    await interaction.deferReply();
    try {
      const s = await pingMinecraft(address);
      const embed = brandEmbed(interaction.client)
        .setTitle(`🟢 ${escapeMarkdown(address)}`)
        .addFields(
          { name: "Players", value: `${s.online.toLocaleString("en-US")} / ${s.max.toLocaleString("en-US")}`, inline: true },
          { name: "Version", value: escapeMarkdown(s.version) || "unknown", inline: true },
          { name: "Ping", value: `${s.latencyMs} ms`, inline: true },
        );
      if (s.motd) embed.setDescription(escapeMarkdown(s.motd));
      if (s.players.length)
        embed.addFields({
          name: "Online now",
          value: s.players
            .map((p) => escapeMarkdown(p))
            .join(", ")
            .slice(0, 1024),
        });
      await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (err) {
      if (err instanceof McPingError) {
        await interaction.editReply({ content: `🔴 **${escapeMarkdown(address)}**: ${err.message}`, allowedMentions: { parse: [] } });
        return;
      }
      throw err;
    }
  }
}
