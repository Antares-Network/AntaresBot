import { Command } from "@sapphire/framework";
import { ChannelType, PermissionFlagsBits } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { formatBirthday, isValidBirthday, MONTH_NAMES } from "../../lib/features/birthdays.js";
import { roleAssignProblem } from "../../lib/features/roleSafety.js";
import { clearBirthday, getBirthday, setBirthday, upcomingBirthdays } from "../../lib/services/birthdays.js";
import { ensureServer } from "../../lib/services/servers.js";
import { getFeatureSettings, SettingsValidationError, updateSettings } from "../../lib/services/settings.js";

export class BirthdayCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: "birthday", description: "Birthday announcements" });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b
        .addSubcommand((s) =>
          s
            .setName("set")
            .setDescription("Tell this server your birthday (month and day only)")
            .addIntegerOption((o) =>
              o
                .setName("month")
                .setDescription("Month")
                .setRequired(true)
                .addChoices(...MONTH_NAMES.map((name, i) => ({ name, value: i + 1 }))),
            )
            .addIntegerOption((o) => o.setName("day").setDescription("Day").setRequired(true).setMinValue(1).setMaxValue(31)),
        )
        .addSubcommand((s) => s.setName("remove").setDescription("Forget your birthday in this server"))
        .addSubcommand((s) => s.setName("upcoming").setDescription("Upcoming birthdays in this server"))
        .addSubcommand((s) =>
          s
            .setName("setup")
            .setDescription("Turn on birthday announcements (needs Manage Server)")
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("Where to announce")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
            )
            .addRoleOption((o) => o.setName("role").setDescription("Role given for the day"))
            .addStringOption((o) => o.setName("timezone").setDescription("e.g. America/Chicago (default UTC)").setMaxLength(64))
            .addIntegerOption((o) =>
              o.setName("hour").setDescription("Local hour to announce, 0-23 (default 9)").setMinValue(0).setMaxValue(23),
            )
            .addStringOption((o) => o.setName("message").setDescription("Placeholders: {user} {username} {server}").setMaxLength(500)),
        )
        .addSubcommand((s) => s.setName("disable").setDescription("Turn off birthday announcements (needs Manage Server)")),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const sub = interaction.options.getSubcommand();
    const g = interaction.guildId;
    const o = interaction.options;
    const reply = (content: string) => interaction.reply({ content, flags: ephemeral, allowedMentions: { parse: [] } });

    switch (sub) {
      case "set": {
        const month = o.getInteger("month", true);
        const day = o.getInteger("day", true);
        if (!isValidBirthday(month, day)) {
          await reply(`❌ ${MONTH_NAMES[month - 1]} doesn't have ${day} days.`);
          return;
        }
        await ensureServer(interaction.guild);
        await setBirthday(g, interaction.user.id, month, day);
        const cfg = (await getFeatureSettings(g)).birthdays;
        {
          await reply(
            `✅ Saved: **${formatBirthday(month, day)}**. ${cfg.channelId ? "I'll celebrate in this server!" : "(Birthday announcements aren't turned on here yet.)"} Use \`/birthday remove\` any time.`,
          );
          return;
        }
      }
      case "remove": {
        await reply(
          (await clearBirthday(g, interaction.user.id))
            ? "✅ Your birthday was removed from this server."
            : "You hadn't set a birthday here.",
        );
        return;
      }
      case "upcoming": {
        const cfg = (await getFeatureSettings(g)).birthdays;
        const [rows, mine] = await Promise.all([upcomingBirthdays(g, cfg.timezone, 10), getBirthday(g, interaction.user.id)]);
        const lines = rows.map(
          (r) =>
            `${r.inDays === 0 ? "🎂 **today**" : r.inDays === 1 ? "tomorrow" : `in ${r.inDays} days`}: <@${r.userId}> (${formatBirthday(r.month, r.day)})`,
        );
        await interaction.reply({
          embeds: [
            brandEmbed(interaction.client)
              .setTitle("🎂 Upcoming birthdays")
              .setDescription(lines.join("\n") || "Nobody has set a birthday yet. Use `/birthday set`!")
              .setFooter({ text: `Yours: ${mine ? formatBirthday(mine.month, mine.day) : "not set"} · time zone ${cfg.timezone}` }),
          ],
          allowedMentions: { parse: [] },
        });
        return;
      }
    }

    // setup / disable
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      await reply("❌ You need **Manage Server** for that.");
      return;
    }
    await ensureServer(interaction.guild);
    try {
      if (sub === "disable") {
        await updateSettings(g, "birthdays", { channelId: null, roleId: null });
        {
          await reply("✅ Birthday announcements are off. Members' saved birthdays are kept.");
          return;
        }
      }
      const channel = o.getChannel("channel", true);
      const role = o.getRole("role");
      if (role) {
        const problem = roleAssignProblem(role, interaction.member);
        if (problem) {
          await reply(`❌ ${problem}`);
          return;
        }
      }
      const tz = o.getString("timezone")?.trim();
      const hour = o.getInteger("hour");
      const message = o.getString("message");
      const s = await updateSettings(g, "birthdays", {
        channelId: channel.id,
        roleId: role?.id ?? null,
        ...(tz ? { timezone: tz } : {}),
        ...(hour !== null ? { hour } : {}),
        ...(message ? { message } : {}),
      });
      if (!s) {
        await reply("❌ This server isn't set up yet.");
        return;
      }
      await reply(
        `✅ Birthdays will be announced in <#${s.channelId}> at **${String(s.hour).padStart(2, "0")}:00 ${s.timezone}**${s.roleId ? ` and members get <@&${s.roleId}> for the day` : ""}. Members use \`/birthday set\`.`,
      );
    } catch (err) {
      if (err instanceof SettingsValidationError) {
        {
          await reply(`❌ ${err.issues.join("\n")}\nTime zones look like \`Europe/London\` or \`America/New_York\`.`);
          return;
        }
      }
      throw err;
    }
  }
}
