import { Precondition, type ChatInputCommand } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";
import { getFeatureSettings } from "../lib/services/settings.js";

/** Commands a server can never turn off: /config is how they are turned back on. */
export const ALWAYS_ENABLED = new Set(["config"]);

/**
 * Global precondition (runs before every command): refuses commands a server turned off
 * with `/config command`. Settings are cached, so this costs no database read per command.
 */
export class CommandEnabledPrecondition extends Precondition {
  public constructor(context: Precondition.LoaderContext, options: Precondition.Options) {
    super(context, { ...options, position: 20 });
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction, command: ChatInputCommand) {
    if (!interaction.guildId || ALWAYS_ENABLED.has(command.name)) return this.ok();
    const { general } = await getFeatureSettings(interaction.guildId);
    if (general.disabledCommands.includes(command.name)) {
      return this.error({ message: `\`/${command.name}\` is turned off in this server.` });
    }
    return this.ok();
  }
}

declare module "@sapphire/framework" {
  interface Preconditions {
    CommandEnabled: never;
  }
}
