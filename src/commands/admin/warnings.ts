import { Command } from "@sapphire/framework";
import { PermissionFlagsBits, time } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed, truncate } from "../../lib/embeds.js";
import { activeStrikes, CASE_LABEL, listCases } from "../../lib/services/cases.js";
import { getFeatureSettings } from "../../lib/services/settings.js";

export class WarningsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "warnings",
      description: "List a member's moderation cases",
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((o) => o.setName("member").setDescription("Whose cases").setRequired(true)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const user = interaction.options.getUser("member", true);
    const cfg = (await getFeatureSettings(interaction.guildId)).warnings;
    const [cases, strikes] = await Promise.all([
      listCases(interaction.guildId, user.id),
      activeStrikes(interaction.guildId, user.id, cfg.expireDays),
    ]);
    const lines = cases.map(
      (c) =>
        `${c.active ? "" : "~~"}**#${c.number}** ${CASE_LABEL[c.type]} ${time(c.createdAt, "d")}: ${truncate(c.reason || "no reason", 80)}${c.active ? "" : "~~"}`,
    );
    await interaction.reply({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle(`Cases for ${user.username}`)
          .setDescription(truncate(lines.join("\n") || "No cases. 🎉", 4000))
          .addFields({
            name: "Active warnings",
            value: `${strikes}${cfg.escalateAt ? ` (escalates every ${cfg.escalateAt}: ${cfg.escalateAction})` : ""}`,
          }),
      ],
      flags: ephemeral,
      allowedMentions: { parse: [] },
    });
  }
}
