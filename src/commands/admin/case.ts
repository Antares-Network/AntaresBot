import { Command } from "@sapphire/framework";
import { PermissionFlagsBits, type SlashCommandIntegerOption } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { caseEmbed, getCase, setCaseActive, setCaseReason } from "../../lib/services/cases.js";
import { ensureServer } from "../../lib/services/servers.js";
import { SettingsValidationError, updateSettings } from "../../lib/services/settings.js";

export class CaseCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "case",
      description: "View or manage moderation cases",
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    const num = (o: SlashCommandIntegerOption) => o.setName("number").setDescription("Case #").setRequired(true).setMinValue(1);
    registerGuildCommand(this, registry, (b) =>
      b
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand((s) => s.setName("view").setDescription("Show a case").addIntegerOption(num))
        .addSubcommand((s) =>
          s.setName("pardon").setDescription("Pardon a case (stops it counting toward escalation)").addIntegerOption(num),
        )
        .addSubcommand((s) => s.setName("restore").setDescription("Undo a pardon").addIntegerOption(num))
        .addSubcommand((s) =>
          s
            .setName("reason")
            .setDescription("Change a case's reason")
            .addIntegerOption(num)
            .addStringOption((o) => o.setName("reason").setDescription("New reason").setRequired(true).setMaxLength(500)),
        )
        .addSubcommand((s) =>
          s
            .setName("settings")
            .setDescription("Warning rules (needs Manage Server)")
            .addBooleanOption((o) => o.setName("dm_members").setDescription("DM members when they're warned"))
            .addIntegerOption((o) =>
              o.setName("escalate_at").setDescription("Escalate every N active warnings (0 = never)").setMinValue(0).setMaxValue(20),
            )
            .addStringOption((o) =>
              o
                .setName("escalate_action")
                .setDescription("What escalation does")
                .addChoices({ name: "timeout", value: "timeout" }, { name: "kick", value: "kick" }),
            )
            .addIntegerOption((o) =>
              o.setName("timeout_minutes").setDescription("Escalation timeout length").setMinValue(1).setMaxValue(40_320),
            )
            .addIntegerOption((o) =>
              o.setName("expire_days").setDescription("Warnings older than this stop counting (0 = never)").setMinValue(0).setMaxValue(365),
            ),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const sub = interaction.options.getSubcommand();
    const g = interaction.guildId;
    const reply = (content: string) => interaction.reply({ content, flags: ephemeral, allowedMentions: { parse: [] } });

    if (sub === "settings") {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        await reply("❌ You need **Manage Server** to change warning rules.");
        return;
      }
      const o = interaction.options;
      const patch = {
        ...(o.getBoolean("dm_members") !== null ? { dmMembers: o.getBoolean("dm_members") as boolean } : {}),
        ...(o.getInteger("escalate_at") !== null ? { escalateAt: o.getInteger("escalate_at") as number } : {}),
        ...(o.getString("escalate_action") ? { escalateAction: o.getString("escalate_action") as "timeout" | "kick" } : {}),
        ...(o.getInteger("timeout_minutes") ? { escalateMinutes: o.getInteger("timeout_minutes") as number } : {}),
        ...(o.getInteger("expire_days") !== null ? { expireDays: o.getInteger("expire_days") as number } : {}),
      };
      await ensureServer(interaction.guild);
      try {
        const s = await updateSettings(g, "warnings", patch);
        if (!s) {
          await reply("❌ This server isn't set up yet.");
          return;
        }
        {
          await reply(
            `✅ Warnings: DM members **${s.dmMembers ? "on" : "off"}** · escalate ${s.escalateAt ? `every **${s.escalateAt}** → **${s.escalateAction}**${s.escalateAction === "timeout" ? ` (${s.escalateMinutes} min)` : ""}` : "**never**"} · expire after ${s.expireDays ? `**${s.expireDays}** days` : "**never**"}.`,
          );
          return;
        }
      } catch (err) {
        if (err instanceof SettingsValidationError) {
          await reply(`❌ ${err.issues.join("\n")}`);
          return;
        }
        throw err;
      }
    }

    const number = interaction.options.getInteger("number", true);
    const c = await getCase(g, number);
    if (!c) {
      await reply(`There's no case #${number} here.`);
      return;
    }

    switch (sub) {
      case "view":
        await interaction.reply({ embeds: [caseEmbed(c)], flags: ephemeral, allowedMentions: { parse: [] } });
        return;
      case "pardon":
      case "restore":
        await setCaseActive(g, number, sub === "restore");
        await reply(`✅ Case #${number} ${sub === "pardon" ? "pardoned: it no longer counts toward escalation" : "restored"}.`);
        return;
      case "reason":
        await setCaseReason(g, number, interaction.options.getString("reason", true));
        await reply(`✅ Updated the reason for case #${number}.`);
        return;
    }
  }
}
