import { Precondition } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";
import { getSettings } from "../lib/services/servers.js";

/** v1 `adminChanCheck`: admin commands may only run in the configured admin channel. */
export class AdminChannelPrecondition extends Precondition {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) return this.error({ message: "This command can only be used in a server." });
    const settings = await getSettings(interaction.guildId);
    if (!settings?.adminChannelId) {
      return this.error({
        message: "No admin channel has been set yet.\nUse `/setup type:admin channel:#channel` first.",
      });
    }
    if (interaction.channelId !== settings.adminChannelId) {
      return this.error({ message: `You can only use this command in <#${settings.adminChannelId}>` });
    }
    return this.ok();
  }
}

declare module "@sapphire/framework" {
  interface Preconditions {
    AdminChannel: never;
  }
}
