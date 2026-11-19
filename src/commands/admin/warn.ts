import { Command } from "@sapphire/framework";
import { PermissionFlagsBits } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { moderationProblem } from "../../lib/features/moderation.js";
import { recordStrike } from "../../lib/services/cases.js";
import { ensureServer } from "../../lib/services/servers.js";

export class WarnCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "warn",
      description: "Warn a member (recorded as a numbered case)",
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((o) => o.setName("member").setDescription("Who to warn").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Why (the member sees this)").setRequired(true).setMaxLength(500)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const user = interaction.options.getUser("member", true);
    const target = interaction.options.getMember("member");
    const problem = moderationProblem({
      actorId: interaction.user.id,
      targetId: user.id,
      ownerId: interaction.guild.ownerId,
      targetIsBot: user.bot,
      actorTop: interaction.member.roles.highest.position,
      targetTop: target ? target.roles.highest.position : null,
    });
    if (problem) {
      await interaction.reply({ content: `❌ ${problem}`, flags: ephemeral });
      return;
    }
    await interaction.deferReply({ flags: ephemeral });
    await ensureServer(interaction.guild);
    const { strike, strikes, escalation } = await recordStrike(interaction.guild, {
      userId: user.id,
      moderatorId: interaction.user.id,
      type: "warn",
      reason: interaction.options.getString("reason", true),
    });
    await interaction.editReply({
      content:
        `✅ Case **#${strike.number}**: warned <@${user.id}>. They now have **${strikes}** active warning(s).` +
        (escalation ? `\n⏫ Escalated automatically: case **#${escalation.number}** (${escalation.type}).` : ""),
      allowedMentions: { parse: [] },
    });
  }
}
