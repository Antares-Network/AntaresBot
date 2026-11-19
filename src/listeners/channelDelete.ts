import { Events, Listener } from "@sapphire/framework";
import type { DMChannel, GuildChannel } from "discord.js";
import { clearDeletedChannel } from "../lib/services/servers.js";
import { ticketChannelDeleted } from "../lib/services/tickets.js";

export class ChannelDeleteListener extends Listener<typeof Events.ChannelDelete> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.ChannelDelete });
  }

  public override async run(channel: DMChannel | GuildChannel) {
    if (channel.isDMBased()) return;
    // v1 only cleared the counting channel; a deleted bot/admin channel locked every command.
    await ticketChannelDeleted(channel.id);
    const cleared = await clearDeletedChannel(channel.guildId, channel.id);
    if (cleared.length > 0) {
      this.container.logger.info(`Channel deleted in ${channel.guild.name}; cleared ${cleared.join(", ")}`);
    }
  }
}
