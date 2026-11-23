import { Command } from "@sapphire/framework";
import { ChannelType, type Guild } from "discord.js";
import { ephemeral, registerOwnerCommand } from "../../lib/commands.js";
import { getSettings, setChannel } from "../../lib/services/servers.js";

/** Prefer a channel named exactly "counting", then the top-most one containing "counting". */
function findCountingChannel(guild: Guild) {
  const candidates = guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildText && c.name.includes("counting"))
    .sort((a, b) => ("position" in a && "position" in b ? a.position - b.position : 0));
  return candidates.find((c) => c.name === "counting") ?? candidates.first();
}

/**
 * Re-link counting channels by name (v1 maintenance command). Only touches guilds whose
 * configured counting channel is missing or deleted, and never creates new documents.
 */
export class CountingUpdateCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "countingupdate",
      description: "Re-detects counting channels for guilds whose channel is missing",
      preconditions: ["OwnerOnly"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerOwnerCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ephemeral });
    let updated = 0;
    let skipped = 0;
    for (const guild of interaction.client.guilds.cache.values()) {
      const settings = await getSettings(guild.id);
      if (!settings) continue; // unknown guild: don't create a partial document
      if (settings.countingChannelId && guild.channels.cache.has(settings.countingChannelId)) {
        skipped++; // already valid: leave it alone
        continue;
      }
      const chan = findCountingChannel(guild);
      if (!chan) continue;
      if (await setChannel(guild.id, "counting", chan.id)) updated++;
    }
    await interaction.editReply(`Re-linked ${updated} server(s); ${skipped} already had a valid counting channel.`);
  }
}
