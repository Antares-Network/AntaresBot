import { Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, type Role } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { roleAssignProblem } from "../../lib/features/roleSafety.js";
import { ROLE_BUTTON_PREFIX } from "../../lib/roleButtons.js";

export class RoleButtonsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "rolebuttons",
      description: "Post a message with buttons members click to get or remove roles",
      requiredUserPermissions: [PermissionFlagsBits.ManageRoles],
      requiredClientPermissions: [PermissionFlagsBits.ManageRoles],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) => {
      b.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addStringOption((o) => o.setName("title").setDescription("Message title").setRequired(true).setMaxLength(100))
        .addRoleOption((o) => o.setName("role1").setDescription("Role").setRequired(true));
      for (let n = 2; n <= 5; n++) b.addRoleOption((o) => o.setName(`role${n}`).setDescription("Role"));
      b.addStringOption((o) => o.setName("description").setDescription("Message text").setMaxLength(1000)).addChannelOption((o) =>
        o.setName("channel").setDescription("Where to post (default: here)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
      );
      return b;
    });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const roles: Role[] = [];
    for (let n = 1; n <= 5; n++) {
      const role = interaction.options.getRole(`role${n}`);
      if (role && !roles.some((r) => r.id === role.id)) roles.push(role);
    }
    for (const role of roles) {
      const problem = roleAssignProblem(role, interaction.member);
      if (problem) {
        await interaction.reply({ content: `❌ ${problem}`, flags: ephemeral });
        return;
      }
    }

    const target =
      interaction.options.getChannel("channel", false, [ChannelType.GuildText, ChannelType.GuildAnnouncement]) ?? interaction.channel;
    if (!target?.isSendable() || target.guildId !== interaction.guildId) {
      await interaction.reply({ content: "I can't post in that channel.", flags: ephemeral });
      return;
    }
    // Like /say: the caller must be able to post there themselves.
    if (!target.permissionsFor(interaction.member).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
      await interaction.reply({ content: "You don't have permission to send messages in that channel.", flags: ephemeral });
      return;
    }
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      roles.map((r) => new ButtonBuilder().setCustomId(`${ROLE_BUTTON_PREFIX}${r.id}`).setLabel(r.name.slice(0, 80)).setStyle(ButtonStyle.Secondary)),
    );
    await target.send({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle(interaction.options.getString("title", true))
          .setDescription(interaction.options.getString("description") ?? "Click a button to get or remove a role."),
      ],
      components: [row],
      allowedMentions: { parse: [] },
    });
    await interaction.reply({ content: `✅ Role buttons posted in <#${target.id}>.`, flags: ephemeral });
  }
}
