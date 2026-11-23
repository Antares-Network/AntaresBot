import { Command } from "@sapphire/framework";
import { ChannelType, PermissionFlagsBits, type MessageMentionOptions } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";

export class SayCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: "Makes the bot say something",
      requiredUserPermissions: [PermissionFlagsBits.ManageMessages],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption((o) => o.setName("content").setDescription("What to say").setRequired(true).setMaxLength(2000))
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("The channel to say the thing in")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const content = interaction.options.getString("content", true);
    const target =
      interaction.options.getChannel("channel", false, [ChannelType.GuildText, ChannelType.GuildAnnouncement]) ??
      interaction.channel;

    if (!target?.isSendable() || target.guildId !== interaction.guildId) {
      await interaction.reply({ content: "I can't send messages to that channel.", flags: ephemeral });
      return;
    }

    // Security: v1 let anyone with Manage Messages make the bot post anywhere and ping @everyone.
    // The caller must be able to post in the target themselves, and pings are limited to what
    // they could do themselves.
    const perms = target.permissionsFor(interaction.member);
    if (!perms.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
      await interaction.reply({ content: "You don't have permission to send messages in that channel.", flags: ephemeral });
      return;
    }
    const allowedMentions: MessageMentionOptions = perms.has(PermissionFlagsBits.MentionEveryone)
      ? { parse: ["users", "roles", "everyone"] }
      : { parse: ["users"] };

    await target.send({ content, allowedMentions });
    await interaction.reply({ content: `Message sent in <#${target.id}>`, flags: ephemeral });
  }
}
