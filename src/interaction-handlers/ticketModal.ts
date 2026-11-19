import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ModalSubmitInteraction } from "discord.js";
import { ephemeral } from "../lib/commands.js";
import { openTicket, TICKET_MODAL_ID } from "../lib/services/tickets.js";

/** The "What do you need help with?" form. */
export class TicketModalHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.ModalSubmit });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    return interaction.customId === TICKET_MODAL_ID ? this.some() : this.none();
  }

  public override async run(interaction: ModalSubmitInteraction) {
    if (!interaction.inCachedGuild()) return;
    await interaction.deferReply({ flags: ephemeral });
    const r = await openTicket(interaction.member, interaction.fields.getTextInputValue("subject"));
    await interaction.editReply({
      content: r.ok ? `✅ Ticket #${r.number} opened: <#${r.channelId}>` : `❌ ${r.reason}`,
      allowedMentions: { parse: [] },
    });
  }
}
