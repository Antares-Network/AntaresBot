import { Precondition } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";
import { gate } from "../lib/services/gate.js";

/**
 * Global precondition (`position` makes Sapphire run it before EVERY command), so a ban
 * applies to all commands, not just the ones that use BotChannel. Bot owners are exempt.
 */
export class NotBannedPrecondition extends Precondition {
  public constructor(context: Precondition.LoaderContext, options: Precondition.Options) {
    super(context, { ...options, position: 10 });
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (this.container.config.BOT_OWNER_IDS.includes(interaction.user.id)) return this.ok();

    const g = await gate.get();
    if (interaction.guildId && g.bannedGuilds.has(interaction.guildId)) {
      return this.error({ message: "This server has been banned from using this bot by the owner." });
    }
    if (g.bannedUsers.has(interaction.user.id)) {
      return this.error({ message: "You have been banned from using this bot by the owner." });
    }
    const ownerId = interaction.guild?.ownerId;
    if (ownerId && g.bannedOwners.has(ownerId)) {
      return this.error({ message: "This server's owner has been banned from using this bot." });
    }
    return this.ok();
  }
}

declare module "@sapphire/framework" {
  interface Preconditions {
    NotBanned: never;
  }
}
