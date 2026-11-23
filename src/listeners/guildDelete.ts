import { Events, Listener } from "@sapphire/framework";
import type { Guild } from "discord.js";
import { DEFAULT_AVATAR } from "../lib/constants.js";
import { brandEmbed } from "../lib/embeds.js";
import { report } from "../lib/reporting.js";
import { deleteAllGuildData } from "../lib/services/privacy.js";
import { getServer } from "../lib/services/servers.js";

export class GuildDeleteListener extends Listener<typeof Events.GuildDelete> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildDelete });
  }

  public override async run(guild: Guild) {
    // `available === false` means a Discord outage, not that we were removed. Keep the data.
    if (!guild.available) return;

    const doc = await getServer(guild.id);
    // Privacy policy promise: all guild data is deleted when the bot leaves.
    await deleteAllGuildData(guild.id);
    this.container.logger.info(`Left server ${guild.name} (${guild.id}); data deleted`);

    await report(guild.client, {
      embeds: [
        brandEmbed(guild.client)
          .setTitle("I Left a Server")
          .setThumbnail(guild.iconURL() ?? DEFAULT_AVATAR)
          .addFields(
            { name: "Guild Creation Date:", value: guild.createdAt.toString() },
            { name: "Guild Leave Date:", value: new Date().toString() },
            { name: "Guild Name:", value: guild.name },
            { name: "Guild ID:", value: guild.id },
            { name: "Owner ID:", value: guild.ownerId },
            { name: "Guild Member Count:", value: String(doc?.memberCount ?? guild.memberCount) },
          ),
      ],
    });
  }
}
