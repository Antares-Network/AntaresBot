import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";
import { ephemeral } from "../lib/commands.js";
import { gate } from "../lib/services/gate.js";
import { closeTicket, openModal, TICKET_CLOSE_ID, TICKET_OPEN_ID } from "../lib/services/tickets.js";

/** Panel "Open a ticket" and in-ticket "Close" buttons. */
export class TicketButtonHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  public override parse(interaction: ButtonInteraction) {
    return interaction.customId === TICKET_OPEN_ID || interaction.customId === TICKET_CLOSE_ID
      ? this.some(interaction.customId)
      : this.none();
  }

  public override async run(interaction: ButtonInteraction, id: InteractionHandler.ParseResult<this>) {
    if (!interaction.inCachedGuild()) return;
    if (await gate.isBanned({ userId: interaction.user.id, guildId: interaction.guildId, ownerId: interaction.guild.ownerId })) {
      await interaction.reply({ content: "You're not allowed to use this bot.", flags: ephemeral });
      return;
    }
    if (id === TICKET_OPEN_ID) {
      await interaction.showModal(openModal());
      return;
    }
    const channel = interaction.channel;
    if (!channel) return;
    const r = await closeTicket(interaction.guild, channel, interaction.member);
    await interaction.reply(
      r.ok
        ? {
            content: `🔒 Ticket #${r.number} closed by <@${interaction.user.id}>. This channel will be deleted in 5 seconds.`,
            allowedMentions: { parse: [] },
          }
        : { content: r.reason, flags: ephemeral },
    );
  }
}
