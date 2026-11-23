import { Command } from "@sapphire/framework";
import { ChannelType, PermissionFlagsBits, ThreadAutoArchiveDuration } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { truncate } from "../../lib/embeds.js";
import { attachSuggestionMessage, createSuggestion, suggestionEmbed, voteRow } from "../../lib/services/suggestions.js";
import { ensureServer } from "../../lib/services/servers.js";
import { getFeatureSettings } from "../../lib/services/settings.js";

const COOLDOWN_MS = 60_000;

export class SuggestCommand extends Command {
  private readonly last = new Map<string, number>();

  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: "suggest", description: "Make a suggestion for this server" });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b.addStringOption((o) => o.setName("idea").setDescription("Your suggestion").setRequired(true).setMinLength(5).setMaxLength(1000)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const cfg = (await getFeatureSettings(interaction.guildId)).suggestions;
    const channel = cfg.channelId ? interaction.guild.channels.cache.get(cfg.channelId) : undefined;
    if (!channel?.isSendable() || channel.type === ChannelType.GuildVoice) {
      await interaction.reply({
        content: "Suggestions aren't set up in this server. An admin can turn them on with `/suggestion setup`.",
        flags: ephemeral,
      });
      return;
    }
    const key = `${interaction.guildId}:${interaction.user.id}`;
    const now = Date.now();
    const prev = this.last.get(key) ?? 0;
    if (now - prev < COOLDOWN_MS) {
      await interaction.reply({
        content: `Slow down! You can suggest again <t:${Math.ceil((prev + COOLDOWN_MS) / 1000)}:R>.`,
        flags: ephemeral,
      });
      return;
    }
    this.last.set(key, now);
    if (this.last.size > 10_000) this.last.clear();

    await interaction.deferReply({ flags: ephemeral });
    await ensureServer(interaction.guild);
    const number = await createSuggestion(interaction.guildId, interaction.user.id, channel.id);
    const text = interaction.options.getString("idea", true);
    const msg = await channel
      .send({
        embeds: [suggestionEmbed({ number, text, authorId: interaction.user.id, status: "open" })],
        components: [voteRow(number, 0, 0)],
        allowedMentions: { parse: [] },
      })
      .catch(() => null);
    await attachSuggestionMessage(interaction.guildId, number, msg?.id ?? null);
    if (!msg) {
      await interaction.editReply("❌ I couldn't post in the suggestions channel. Ask an admin to check my permissions there.");
      return;
    }
    const me = interaction.guild.members.me;
    if (cfg.threads && me && "permissionsFor" in channel && channel.permissionsFor(me).has(PermissionFlagsBits.CreatePublicThreads)) {
      await msg
        .startThread({
          name: truncate(`#${number} ${text.replace(/\s+/g, " ")}`, 90),
          autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        })
        .catch(() => undefined);
    }
    await interaction.editReply(`✅ Suggestion **#${number}** posted: ${msg.url}`);
  }
}
