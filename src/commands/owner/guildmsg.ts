// Owner-only: send a critical notice (security issue, data breach, etc.) to every server.
// Every other channel (DMing server owners, the support server) should be tried first.
import { setTimeout as wait } from "node:timers/promises";
import { Command } from "@sapphire/framework";
import { ChannelType, type Guild, type GuildTextBasedChannel } from "discord.js";
import { ephemeral, registerOwnerCommand } from "../../lib/commands.js";
import { SUPPORT_SERVER_URL } from "../../lib/constants.js";
import { brandEmbed } from "../../lib/embeds.js";
import { gate } from "../../lib/services/gate.js";
import { getSettings } from "../../lib/services/servers.js";

async function targetChannel(guild: Guild): Promise<GuildTextBasedChannel | null> {
  const me = guild.members.me;
  if (!me) return null;
  const canSend = (c: GuildTextBasedChannel) => c.permissionsFor(me).has(["ViewChannel", "SendMessages", "EmbedLinks"]);

  const configured = (await getSettings(guild.id))?.botChannelId;
  const ch = configured ? guild.channels.cache.get(configured) : undefined;
  if (ch?.isTextBased() && canSend(ch)) return ch;

  return (
    guild.channels.cache
      .filter((c): c is GuildTextBasedChannel => c.type === ChannelType.GuildText && canSend(c as GuildTextBasedChannel))
      .sort((a, b) => ("position" in a && "position" in b ? a.position - b.position : 0))
      .first() ?? null
  );
}

export class GuildMsgCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: "guildmsg", description: "Sends a message to every guild the bot is in", preconditions: ["OwnerOnly"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerOwnerCommand(this, registry, (b) =>
      b
        .addStringOption((o) => o.setName("text").setDescription("Message").setRequired(true).setMaxLength(1024))
        .addBooleanOption((o) => o.setName("confirm").setDescription("Really send to EVERY server?").setRequired(true)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.options.getBoolean("confirm", true)) {
      await interaction.reply({ content: "Cancelled (confirm was false).", flags: ephemeral });
      return;
    }
    const text = interaction.options.getString("text", true);
    await interaction.deferReply({ flags: ephemeral });

    const embed = brandEmbed(interaction.client)
      .setURL(SUPPORT_SERVER_URL)
      .setTitle("Antares Bot -- System Update Message")
      .setDescription("I have just flown in to tell you that my developers have something to say:")
      .addFields({ name: "Message:", value: text });

    let sent = 0;
    let failed = 0;
    for (const guild of interaction.client.guilds.cache.values()) {
      if (await gate.isIgnored(guild.id)) continue;
      try {
        const ch = await targetChannel(guild);
        if (!ch) throw new Error("no sendable channel");
        await ch.send({ embeds: [embed], allowedMentions: { parse: [] } });
        sent++;
      } catch (err) {
        failed++;
        this.container.logger.warn(`guildmsg: failed for ${guild.id}:`, err);
      }
      await wait(250); // stay well clear of global rate limits
    }
    await interaction.editReply(`Done. Sent to ${sent} server(s), failed for ${failed}.`);
  }
}
