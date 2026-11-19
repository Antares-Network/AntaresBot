import { Command } from "@sapphire/framework";
import { ApplicationIntegrationType, InteractionContextType, time } from "discord.js";
import { ephemeral } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { ACHIEVEMENT_COUNT, achievementsFor } from "../../lib/features/achievements.js";
import { highestLevel } from "../../lib/services/members.js";
import { getUserProfile, setPrivateProfile } from "../../lib/services/users.js";

const when = (d: Date | null) => (d ? time(d, "R") : "never");

export class ProfileCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "View bot stats for yourself or someone else, or change your privacy" });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      b
        .setName(this.name)
        .setDescription(this.description)
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
        .addSubcommand((s) =>
          s
            .setName("view")
            .setDescription("Show a user's Antares Bot stats")
            .addUserOption((o) => o.setName("user").setDescription("Whose profile (default: you)")),
        )
        .addSubcommand((s) =>
          s
            .setName("private")
            .setDescription("Hide or show your profile to other people")
            .addBooleanOption((o) => o.setName("enabled").setDescription("true = only you can see it").setRequired(true)),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (interaction.options.getSubcommand() === "private") {
      const enabled = interaction.options.getBoolean("enabled", true);
      await setPrivateProfile(interaction.user, enabled);
      await interaction.reply({
        content: enabled ? "Your profile is now private." : "Your profile is now visible to others.",
        flags: ephemeral,
      });
      return;
    }

    const target = interaction.options.getUser("user") ?? interaction.user;
    const self = target.id === interaction.user.id;
    const profile = await getUserProfile(target.id);

    // A private profile looks exactly like "no data" to others, so it leaks nothing.
    if (!profile || (profile.privateProfile && !self)) {
      await interaction.reply({
        content: self ? "You haven't used the bot yet, so there's nothing stored about you." : "No public profile for that user.",
        flags: ephemeral,
      });
      return;
    }

    const top = profile.topCommands.map((c) => `\`/${c.name}\` × ${c.uses}`).join("\n") || "none yet";
    const bestLevel = await highestLevel(target.id);
    const badges = achievementsFor({
      commandsUsed: profile.commandsUsed,
      commands: profile.commands,
      countingCorrect: profile.countingCorrect,
      highestLevel: bestLevel,
      firstSeenAt: profile.firstSeenAt,
    });
    const badgeText = badges.length
      ? `${badges.map((b) => `${b.emoji} **${b.name}**: ${b.description}`).join("\n")}\n*${badges.length}/${ACHIEVEMENT_COUNT} unlocked*`
      : `None yet (${ACHIEVEMENT_COUNT} to unlock)`;
    await interaction.reply({
      // Your own profile is only shown to you; viewing someone else's public one is public.
      flags: self ? ephemeral : undefined,
      allowedMentions: { parse: [] },
      embeds: [
        brandEmbed(interaction.client)
          .setTitle(`${target.username}'s profile`)
          .setThumbnail(target.displayAvatarURL())
          .addFields(
            { name: "Commands used", value: String(profile.commandsUsed), inline: true },
            { name: "Counting", value: `${profile.countingCorrect} ✅ / ${profile.countingMistakes} ❌`, inline: true },
            { name: "Best level", value: String(bestLevel), inline: true },
            { name: "Favourite commands", value: top },
            { name: "Achievements", value: badgeText },
            { name: "First seen", value: when(profile.firstSeenAt), inline: true },
            { name: "Last active", value: when(profile.lastSeenAt), inline: true },
            ...(self ? [{ name: "Privacy", value: profile.privateProfile ? "Private" : "Public" }] : []),
          ),
      ],
    });
  }
}
