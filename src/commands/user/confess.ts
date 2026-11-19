import { Command } from "@sapphire/framework";
import { EmbedBuilder, time } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { attachMessage, beginConfession } from "../../lib/services/confessions.js";
import { getFeatureSettings } from "../../lib/services/settings.js";

export class ConfessCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Post an anonymous confession to this server's confession channel" });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b.addStringOption((o) => o.setName("text").setDescription("Your confession (anonymous)").setRequired(true).setMinLength(3).setMaxLength(1500)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const secret = this.container.config.CONFESSION_SECRET;
    if (!secret) {
      await interaction.reply({ content: "Confessions aren't available on this bot.", flags: ephemeral });
      return;
    }
    // Everything about this command is ephemeral, so nobody sees who ran it.
    await interaction.deferReply({ flags: ephemeral });
    const result = await beginConfession(secret, interaction.guildId, interaction.user.id);
    if (!result.ok) {
      const text = {
        disabled: "Confessions aren't turned on in this server.",
        banned: "You can't post confessions in this server.",
        cooldown: `Please wait before confessing again (${time(new Date(Date.now() + (result.retryAfterMs ?? 0)), "R")}).`,
      }[result.reason];
      await interaction.editReply(text);
      return;
    }

    const channelId = (await getFeatureSettings(interaction.guildId)).confessions.channelId;
    const channel = channelId ? interaction.guild.channels.cache.get(channelId) : undefined;
    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`🤫 Confession #${result.number}`)
      .setDescription(interaction.options.getString("text", true))
      .setTimestamp();
    const posted = channel?.isSendable()
      ? await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => null)
      : null;
    await attachMessage(interaction.guildId, result.number, posted?.id ?? null);
    await interaction.editReply(posted ? `✅ Posted anonymously as confession #${result.number}.` : "I couldn't post in the confession channel. Ask an admin to check my permissions.");
  }
}
