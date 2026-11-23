import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";
import { ephemeral } from "../lib/commands.js";
import { HELP_PREFIX, helpPage } from "../lib/help.js";
import { gate } from "../lib/services/gate.js";

/**
 * Stateless handler for /help and /adminhelp buttons. Replaces v1's per-invocation
 * message collectors, which never expired and replied multiple times once two help
 * messages existed in a channel.
 */
export class HelpButtonHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  public override async parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(HELP_PREFIX)) return this.none();
    const page = helpPage(interaction.customId.slice(HELP_PREFIX.length));
    if (!page) return this.none();
    const banned = await gate.isBanned({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      ownerId: interaction.guild?.ownerId,
    });
    return banned ? this.none() : this.some(page);
  }

  public override async run(interaction: ButtonInteraction, page: InteractionHandler.ParseResult<this>) {
    await interaction.reply({ embeds: [page.build(interaction.client)], flags: ephemeral });
  }
}
