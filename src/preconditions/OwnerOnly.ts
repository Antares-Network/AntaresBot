import { Precondition } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";

export class OwnerOnlyPrecondition extends Precondition {
  public override chatInputRun(interaction: ChatInputCommandInteraction) {
    return this.container.config.BOT_OWNER_IDS.includes(interaction.user.id)
      ? this.ok()
      : this.error({ message: "This command is restricted to the bot owner." });
  }
}

declare module "@sapphire/framework" {
  interface Preconditions {
    OwnerOnly: never;
  }
}
