import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";
import { ephemeral } from "../lib/commands.js";
import { gate } from "../lib/services/gate.js";
import { SUGGESTION_PREFIX, voteRow, voteSuggestion } from "../lib/services/suggestions.js";

/** 👍 / 👎 on a suggestion. Custom ID: "sg:up:<number>" / "sg:down:<number>". */
export class SuggestionVoteHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  public override parse(interaction: ButtonInteraction) {
    const m = new RegExp(`^${SUGGESTION_PREFIX}(up|down):(\\d{1,9})$`).exec(interaction.customId);
    return m ? this.some({ dir: m[1] as "up" | "down", number: Number(m[2]) }) : this.none();
  }

  public override async run(interaction: ButtonInteraction, { dir, number }: InteractionHandler.ParseResult<this>) {
    if (!interaction.inCachedGuild()) return;
    if (await gate.isBanned({ userId: interaction.user.id, guildId: interaction.guildId, ownerId: interaction.guild.ownerId })) {
      await interaction.reply({ content: "You're not allowed to use this bot.", flags: ephemeral });
      return;
    }
    const r = await voteSuggestion(interaction.guildId, number, interaction.user.id, dir);
    if (!r) {
      await interaction.reply({ content: "Voting on this suggestion is closed.", flags: ephemeral });
      return;
    }
    await interaction.update({ components: [voteRow(number, r.up, r.down)] });
    await interaction.followUp({
      content: r.mine ? `You voted ${r.mine === "up" ? "👍" : "👎"} on #${number}.` : `Removed your vote on #${number}.`,
      flags: ephemeral,
    });
  }
}
