import { Events, Listener } from "@sapphire/framework";
import type { Guild } from "discord.js";
import { report } from "../lib/reporting.js";
import { updateServer } from "../lib/services/servers.js";

export class GuildUpdateListener extends Listener<typeof Events.GuildUpdate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildUpdate });
  }

  public override async run(oldGuild: Guild, newGuild: Guild) {
    // v1 used an else-if chain, so only the first of several simultaneous changes was saved.
    const patch: Parameters<typeof updateServer>[1] = {};
    if (oldGuild.name !== newGuild.name) patch.name = newGuild.name;
    if (oldGuild.icon !== newGuild.icon) patch.iconUrl = newGuild.iconURL();
    if (oldGuild.ownerId !== newGuild.ownerId) patch.ownerId = newGuild.ownerId;
    if (Object.keys(patch).length === 0) return;

    await updateServer(newGuild.id, patch);
    if (patch.ownerId) {
      await report(
        newGuild.client,
        `GUILD OWNER UPDATE [${newGuild.name}] [${oldGuild.ownerId}] ---> [${newGuild.ownerId}]`,
      );
    }
  }
}
