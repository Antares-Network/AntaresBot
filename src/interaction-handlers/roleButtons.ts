import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";
import { ephemeral } from "../lib/commands.js";
import { roleAssignProblem } from "../lib/features/roleSafety.js";
import { ROLE_BUTTON_PREFIX } from "../lib/roleButtons.js";
import { gate } from "../lib/services/gate.js";

/**
 * Self-assign role buttons. The role is re-validated on EVERY click: if an admin later
 * gives that role dangerous permissions, the button stops working instead of becoming a
 * privilege-escalation hole.
 */
export class RoleButtonHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(ROLE_BUTTON_PREFIX)) return this.none();
    const roleId = interaction.customId.slice(ROLE_BUTTON_PREFIX.length);
    return /^\d{17,20}$/.test(roleId) ? this.some(roleId) : this.none();
  }

  public override async run(interaction: ButtonInteraction, roleId: InteractionHandler.ParseResult<this>) {
    if (!interaction.inCachedGuild()) return;
    if (await gate.isBanned({ userId: interaction.user.id, guildId: interaction.guildId, ownerId: interaction.guild.ownerId })) {
      await interaction.reply({ content: "You're not allowed to use this bot.", flags: ephemeral });
      return;
    }
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      await interaction.reply({ content: "That role no longer exists.", flags: ephemeral });
      return;
    }
    const problem = roleAssignProblem(role);
    if (problem) {
      await interaction.reply({ content: `This button is disabled: ${problem}`, flags: ephemeral });
      return;
    }
    const has = interaction.member.roles.cache.has(role.id);
    if (has) await interaction.member.roles.remove(role, "Role button");
    else await interaction.member.roles.add(role, "Role button");
    await interaction.reply({ content: `${has ? "Removed" : "Added"} <@&${role.id}>.`, flags: ephemeral, allowedMentions: { parse: [] } });
  }
}
