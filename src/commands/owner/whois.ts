import { Command } from "@sapphire/framework";
import { time } from "discord.js";
import { ephemeral, registerOwnerCommand } from "../../lib/commands.js";
import { toSnowflake } from "../../lib/util.js";
import { DEFAULT_AVATAR } from "../../lib/constants.js";
import { brandEmbed } from "../../lib/embeds.js";
import { gate } from "../../lib/services/gate.js";
import { getServer } from "../../lib/services/servers.js";
import { getUserProfile } from "../../lib/services/users.js";

const when = (d: Date | null) => (d ? time(d, "f") : "unknown");
const yesNo = (b: boolean) => (b ? "Yes" : "No");

export class WhoisCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Shows info about a user or a guild specified by ID", preconditions: ["OwnerOnly"] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerOwnerCommand(this, registry, (b) =>
      b
        .addStringOption((o) =>
          o
            .setName("type")
            .setDescription("user or server")
            .setRequired(true)
            .addChoices({ name: "user", value: "user" }, { name: "server", value: "server" }),
        )
        .addStringOption((o) => o.setName("id").setDescription("Snowflake ID").setRequired(true).setMinLength(17).setMaxLength(20)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const type = interaction.options.getString("type", true);
    const id = toSnowflake(interaction.options.getString("id", true));
    if (!id) {
      await interaction.reply({ content: "That isn't a valid ID.", flags: ephemeral });
      return;
    }
    const g = await gate.get();

    if (type === "user") {
      const user = await interaction.client.users.fetch(id).catch(() => null);
      if (!user) {
        await interaction.reply({ content: "The User ID you entered is not valid. Please try again.", flags: ephemeral });
        return;
      }
      // The owner sees the full stored document, including private profiles.
      const p = await getUserProfile(user.id);
      const stored = p
        ? [
            `First seen: ${when(p.firstSeenAt)}`,
            `Last seen: ${when(p.lastSeenAt)}`,
            `Commands used: ${p.commandsUsed}`,
            `Top commands: ${p.topCommands.map((c) => `/${c.name} (${c.uses})`).join(", ") || "none"}`,
            `Counting: ${p.countingCorrect} correct / ${p.countingMistakes} mistakes`,
            `Private profile: ${yesNo(p.privateProfile)}`,
          ].join("\n")
        : "No stored document (never used the bot).";
      await interaction.reply({
        flags: ephemeral,
        embeds: [
          brandEmbed(interaction.client)
            .setTitle("Who is this user?")
            .setThumbnail(user.displayAvatarURL())
            .addFields(
              { name: "User's Name:", value: user.username, inline: true },
              { name: "User's ID", value: user.id, inline: true },
              { name: "User's Tag", value: user.tag },
              { name: "Is the user a bot?", value: yesNo(user.bot) },
              { name: "User Banned?", value: yesNo(g.bannedUsers.has(user.id)), inline: true },
              { name: "Owner Banned?", value: yesNo(g.bannedOwners.has(user.id)), inline: true },
              { name: "Stored data", value: stored },
            ),
        ],
      });
      return;
    }

    const guild = interaction.client.guilds.cache.get(id);
    if (!guild) {
      await interaction.reply({ content: `I'm not in a server with ID \`${id}\`.`, flags: ephemeral });
      return;
    }
    const doc = await getServer(guild.id);
    await interaction.reply({
      flags: ephemeral,
      embeds: [
        brandEmbed(interaction.client)
          .setTitle(`Server: ${guild.name}`.slice(0, 256))
          .setThumbnail(guild.iconURL() ?? DEFAULT_AVATAR)
          .addFields(
            { name: "Guild Creation Date:", value: when(guild.createdAt) },
            { name: "Guild Join Date:", value: when(doc?.joinedAt ?? null) },
            { name: "Guild Name:", value: guild.name },
            { name: "Guild ID:", value: guild.id },
            { name: "Owner ID:", value: guild.ownerId },
            { name: "Guild Member Count:", value: guild.memberCount.toString() },
            { name: "Messages counted:", value: String(doc?.messageCount ?? 0), inline: true },
            {
              name: "Banned / Ignored?",
              value: `${yesNo(g.bannedGuilds.has(guild.id))} / ${yesNo(g.ignoredGuilds.has(guild.id))}`,
              inline: true,
            },
          ),
      ],
    });
  }
}
