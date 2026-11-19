import { Events, Listener, type InteractionHandlerError } from "@sapphire/framework";
import { GENERIC_ERROR, safeEphemeral } from "../lib/replies.js";

export class InteractionHandlerErrorListener extends Listener<typeof Events.InteractionHandlerError> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.InteractionHandlerError });
  }

  public override async run(error: unknown, { interaction, handler }: InteractionHandlerError) {
    this.container.logger.error(`Interaction handler ${handler.name} failed:`, error);
    if (interaction.isRepliable()) await safeEphemeral(interaction, GENERIC_ERROR);
  }
}
