import { Events, Listener, UserError, type ChatInputCommandErrorPayload } from "@sapphire/framework";
import { GENERIC_ERROR, safeEphemeral } from "../lib/replies.js";
import { SettingsConflictError } from "../lib/services/settings.js";

/** Unexpected command errors: log with context, show the user a generic message (no internals). */
export class ChatInputCommandErrorListener extends Listener<typeof Events.ChatInputCommandError> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.ChatInputCommandError });
  }

  public override async run(error: unknown, { interaction, command }: ChatInputCommandErrorPayload) {
    if (error instanceof UserError) {
      await safeEphemeral(interaction, error.message);
      return;
    }
    // Expected under contention (several people saving the same settings at once): its message
    // is written for users ("please try again"), so show it instead of the generic error.
    if (error instanceof SettingsConflictError) {
      this.container.logger.warn(`Command /${command.name} hit a settings conflict in guild ${interaction.guildId ?? "DM"}`);
      await safeEphemeral(interaction, `❌ ${error.message}`);
      return;
    }
    this.container.logger.error(`Command /${command.name} failed in guild ${interaction.guildId ?? "DM"}:`, error);
    await safeEphemeral(interaction, GENERIC_ERROR);
  }
}
