import { Events, Listener, type ChatInputCommandDeniedPayload, type UserError } from "@sapphire/framework";
import { safeEphemeral } from "../lib/replies.js";

/** Precondition failures (wrong channel, banned, missing permission, cooldown) -> ephemeral reply. */
export class ChatInputCommandDeniedListener extends Listener<typeof Events.ChatInputCommandDenied> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.ChatInputCommandDenied });
  }

  public override async run(error: UserError, { interaction }: ChatInputCommandDeniedPayload) {
    await safeEphemeral(interaction, error.message);
  }
}
