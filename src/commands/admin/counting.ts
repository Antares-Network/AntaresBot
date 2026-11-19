import { Command } from "@sapphire/framework";
import { ChannelType, PermissionFlagsBits } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { setCount } from "../../lib/services/counting.js";
import { ensureServer, getSettings, setChannel } from "../../lib/services/servers.js";

export class CountingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: "Creates a counting channel",
      preconditions: ["AdminChannel"],
      requiredUserPermissions: [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.ManageMessages,
      ],
      requiredClientPermissions: [PermissionFlagsBits.ManageChannels],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b.setDefaultMemberPermissions(
        PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageGuild | PermissionFlagsBits.ManageMessages,
      ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    await ensureServer(interaction.guild);
    const settings = await getSettings(interaction.guildId);

    if (settings?.countingChannelId && interaction.guild.channels.cache.has(settings.countingChannelId)) {
      await interaction.reply(`You already have a counting channel. It is named <#${settings.countingChannelId}>`);
      return;
    }

    await interaction.deferReply({ flags: ephemeral });
    const channel = await interaction.guild.channels.create({
      name: "counting",
      type: ChannelType.GuildText,
      rateLimitPerUser: 5,
      reason: `Counting channel created by ${interaction.user.tag} via /counting`,
    });
    // A brand-new channel starts from 1 (v1 carried the old number over after a channel was deleted).
    await setChannel(interaction.guildId, "counting", channel.id);
    await setCount(interaction.guildId, 0);

    await channel.send({
      embeds: [
        brandEmbed(interaction.client)
          .setTitle("Antares Bot Counting")
          .setDescription(
            "Welcome to your very own counting channel.\n" +
              "Please start counting from `1` using whole numbers.\n\n\n" +
              "**But first some rules:**" +
              "\n\nThis channel has a `5 Second` slowmode" +
              "\n\nYou must alternate players." +
              "\n\nYou may not send more than one number in a row",
          ),
      ],
    });
    await interaction.editReply(`Counting channel created. You can go to it here <#${channel.id}>`);
  }
}
