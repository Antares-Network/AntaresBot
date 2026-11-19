import { Precondition } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";
import { getSettings } from "../lib/services/servers.js";

/**
 * v1 `channelCheck`: restricts regular commands to the server's configured bot channel.
 * (Ban checks now live in the global NotBanned precondition.)
 */
export class BotChannelPrecondition extends Precondition {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) return this.error({ message: "This command can only be used in a server." });

    const settings = await getSettings(interaction.guildId);
    if (!settings?.botChannelId) {
      return this.error({
        message:
          "The server owner has not set a bot channel yet.\nIf you manage this server, use `/setup type:default channel:#channel`.",
      });
    }
    if (interaction.channelId !== settings.botChannelId) {
      return this.error({ message: `You can only use this command in <#${settings.botChannelId}>` });
    }
    return this.ok();
  }
}

declare module "@sapphire/framework" {
  interface Preconditions {
    BotChannel: never;
  }
}
