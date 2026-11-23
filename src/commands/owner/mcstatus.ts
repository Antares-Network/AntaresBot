import { Command } from "@sapphire/framework";
import { ChannelType, escapeMarkdown, PermissionFlagsBits } from "discord.js";
import { ephemeral } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { McPingError, pingMinecraft } from "../../lib/services/mcStatus.js";
import { isOwnerGuild, refreshStatusChannel } from "../../lib/services/mcStatusChannels.js";
import { ensureServer } from "../../lib/services/servers.js";
import { getFeatureSettings, SettingsValidationError, updateSettings } from "../../lib/services/settings.js";

/**
 * Minecraft status voice channel ("🟢 Bergshire: 5/20 online"). Owner-only, and registered
 * only in servers owned by a bot owner (plus the dev servers), because it may ping private
 * addresses on the bot's own network.
 */
export class McStatusCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "mcstatus",
      description: "Minecraft server status channel (owner servers)",
      preconditions: ["OwnerOnly"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    // Runs at ready, so the guild cache (with owner IDs) is populated.
    const guildIds = [
      ...new Set([...this.container.client.guilds.cache.filter((g) => isOwnerGuild(g)).keys(), ...this.container.config.DEV_GUILD_IDS]),
    ];
    if (guildIds.length === 0) return;
    registry.registerChatInputCommand(
      (b) =>
        b
          .setName(this.name)
          .setDescription(this.description)
          .setDefaultMemberPermissions(0n)
          .addSubcommand((s) =>
            s
              .setName("set")
              .setDescription("Show a Minecraft server's status in a voice channel's name")
              .addChannelOption((o) =>
                o
                  .setName("channel")
                  .setDescription("Voice channel to rename")
                  .setRequired(true)
                  .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice),
              )
              .addStringOption((o) =>
                o.setName("address").setDescription("host or host:port (LAN addresses allowed)").setRequired(true).setMaxLength(260),
              )
              .addStringOption((o) => o.setName("label").setDescription("Name shown, e.g. Bergshire").setMaxLength(40))
              .addBooleanOption((o) => o.setName("lock").setDescription("Stop members joining the channel (default on)")),
          )
          .addSubcommand((s) => s.setName("now").setDescription("Ping the configured server now and show who's online"))
          .addSubcommand((s) => s.setName("disable").setDescription("Stop updating the status channel")),
      { guildIds },
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const reply = (content: string) => interaction.editReply({ content, allowedMentions: { parse: [] } });
    await interaction.deferReply({ flags: ephemeral });
    if (!isOwnerGuild(interaction.guild)) {
      await reply("❌ Status channels are only available in servers owned by the bot owner.");
      return;
    }
    await ensureServer(interaction.guild);
    const sub = interaction.options.getSubcommand();

    if (sub === "disable") {
      await updateSettings(interaction.guildId, "mcStatus", { channelId: null });
      {
        await reply("✅ The status channel will no longer be updated (it keeps its current name).");
        return;
      }
    }

    if (sub === "now") {
      const cfg = (await getFeatureSettings(interaction.guildId)).mcStatus;
      if (!cfg.address) {
        await reply("No server is configured. Use `/mcstatus set` first.");
        return;
      }
      try {
        const s = await pingMinecraft(cfg.address, { allowPrivate: true });
        await interaction.editReply({
          embeds: [
            brandEmbed(interaction.client)
              .setTitle(`🟢 ${escapeMarkdown(cfg.label)}`)
              .setDescription(escapeMarkdown(s.motd) || null)
              .addFields(
                { name: "Players", value: `${s.online}/${s.max}`, inline: true },
                { name: "Version", value: escapeMarkdown(s.version) || "unknown", inline: true },
                { name: "Ping", value: `${s.latencyMs} ms`, inline: true },
                {
                  name: "Online now",
                  value: s.players.map((p) => escapeMarkdown(p)).join(", ") || (s.online ? "(server hides the list)" : "nobody"),
                },
              ),
          ],
          allowedMentions: { parse: [] },
        });
      } catch (err) {
        if (err instanceof McPingError) {
          await reply(`🔴 ${cfg.label}: ${err.message}`);
          return;
        }
        throw err;
      }
      return;
    }

    // set
    const channel = interaction.options.getChannel("channel", true, [ChannelType.GuildVoice, ChannelType.GuildStageVoice]);
    const me = interaction.guild.members.me;
    if (!me || !channel.permissionsFor(me).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels])) {
      {
        await reply(`❌ I need **View Channel** and **Manage Channels** on <#${channel.id}>.`);
        return;
      }
    }
    const label = interaction.options.getString("label")?.trim();
    try {
      await updateSettings(interaction.guildId, "mcStatus", {
        channelId: channel.id,
        address: interaction.options.getString("address", true).trim(),
        ...(label ? { label } : {}),
      });
    } catch (err) {
      if (err instanceof SettingsValidationError) {
        await reply(`❌ ${err.issues.join("\n")}`);
        return;
      }
      throw err;
    }
    let lockNote = "";
    if (interaction.options.getBoolean("lock") ?? true) {
      lockNote = await channel.permissionOverwrites
        .edit(interaction.guild.roles.everyone, { Connect: false }, { reason: "Minecraft status channel" })
        .then(
          () => " Members can see it but not join.",
          () => " (I couldn't lock it: I need Manage Roles.)",
        );
    }
    const name = await refreshStatusChannel(interaction.guild);
    await reply(`✅ <#${channel.id}> will show the server status, updated every 10 minutes. Now: **${name ?? "?"}**.${lockNote}`);
  }
}
