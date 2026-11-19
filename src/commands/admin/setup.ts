import { Command } from "@sapphire/framework";
import { ChannelType, PermissionFlagsBits } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { ensureServer, setChannel } from "../../lib/services/servers.js";

export class SetupCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: "Setup command for the default bot channel",
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild | PermissionFlagsBits.ManageChannels)
        .addStringOption((o) =>
          o
            .setName("type")
            .setDescription("Which channel to set")
            .setRequired(true)
            .addChoices({ name: "default (regular commands)", value: "default" }, { name: "admin", value: "admin" }),
        )
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("The channel to setup")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const type = interaction.options.getString("type", true);
    const channel = interaction.options.getChannel("channel", true, [ChannelType.GuildText, ChannelType.GuildAnnouncement]);

    await ensureServer(interaction.guild);
    // v1 stored the channel *object* here, which Mongoose saved as "<#id>" and broke the channel check.
    if (type === "default") {
      await setChannel(interaction.guildId, "bot", channel.id);
      await interaction.reply(`Set the default channel to <#${channel.id}>`);
    } else if (type === "admin") {
      await setChannel(interaction.guildId, "admin", channel.id);
      await interaction.reply(`Set the admin channel to <#${channel.id}>`);
    } else {
      await interaction.reply({ content: "Invalid type. Choose either `default` or `admin`.", flags: ephemeral });
    }
  }
}
