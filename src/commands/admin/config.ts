import { Command } from "@sapphire/framework";
import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type Role,
  type SlashCommandSubcommandGroupBuilder,
} from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed, truncate } from "../../lib/embeds.js";
import { roleAssignProblem } from "../../lib/features/roleSafety.js";
import { matchTimeZones, utcOffset } from "../../lib/features/timezones.js";
import { sendModlog } from "../../lib/services/modlog.js";
import { ensureServer } from "../../lib/services/servers.js";
import {
  getFeatureSettings,
  SettingsValidationError,
  updateSettings,
  type SectionName,
  type ServerSettings,
} from "../../lib/services/settings.js";

const TEXT_CHANNELS = [ChannelType.GuildText, ChannelType.GuildAnnouncement] as const;

type Group = SlashCommandSubcommandGroupBuilder;
const onOff = (s: boolean) => (s ? "on" : "off");
const ch = (id: string | null) => (id ? `<#${id}>` : "—");

export class ConfigCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: "Configure Antares Bot features for this server",
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((s) => s.setName("view").setDescription("Show every setting for this server"))
        .addSubcommand((s) =>
          s
            .setName("timezone")
            .setDescription("Set the server's time zone (used for birthdays and other local times)")
            .addStringOption((o) =>
              o.setName("zone").setDescription("e.g. America/Chicago or Europe/London (start typing a city)").setRequired(true).setMaxLength(64).setAutocomplete(true),
            ),
        )
        .addSubcommandGroup((g: Group) =>
          g
            .setName("levels")
            .setDescription("XP and levels")
            .addSubcommand((s) =>
              s.setName("enable").setDescription("Turn levels on or off").addBooleanOption((o) => o.setName("enabled").setDescription("On?").setRequired(true)),
            )
            .addSubcommand((s) =>
              s
                .setName("announce")
                .setDescription("Where level-up messages go")
                .addStringOption((o) =>
                  o
                    .setName("where")
                    .setDescription("Destination")
                    .setRequired(true)
                    .addChoices(
                      { name: "same channel", value: "same" },
                      { name: "a specific channel", value: "channel" },
                      { name: "DM the member", value: "dm" },
                      { name: "don't announce", value: "off" },
                    ),
                )
                .addChannelOption((o) => o.setName("channel").setDescription("For 'a specific channel'").addChannelTypes(...TEXT_CHANNELS)),
            )
            .addSubcommand((s) =>
              s
                .setName("reward-add")
                .setDescription("Give a role at a level")
                .addIntegerOption((o) => o.setName("level").setDescription("Level").setRequired(true).setMinValue(1).setMaxValue(500))
                .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true)),
            )
            .addSubcommand((s) =>
              s
                .setName("reward-remove")
                .setDescription("Remove a level reward")
                .addIntegerOption((o) => o.setName("level").setDescription("Level").setRequired(true).setMinValue(1).setMaxValue(500)),
            )
            .addSubcommand((s) =>
              s
                .setName("stack")
                .setDescription("Keep lower reward roles when a higher one is earned")
                .addBooleanOption((o) => o.setName("enabled").setDescription("Keep them?").setRequired(true)),
            ),
        )
        .addSubcommandGroup((g: Group) =>
          g
            .setName("counting")
            .setDescription("Counting game rules")
            .addSubcommand((s) =>
              s
                .setName("mode")
                .setDescription("What happens on a mistake")
                .addStringOption((o) =>
                  o
                    .setName("mode")
                    .setDescription("Mode")
                    .setRequired(true)
                    .addChoices(
                      { name: "classic: wrong numbers are deleted", value: "classic" },
                      { name: "reset: a mistake resets to 0 (saves protect you)", value: "reset" },
                    ),
                ),
            )
            .addSubcommand((s) =>
              s.setName("math").setDescription("Allow maths like 12*2").addBooleanOption((o) => o.setName("enabled").setDescription("Allow?").setRequired(true)),
            ),
        )
        .addSubcommandGroup((g: Group) =>
          g
            .setName("welcome")
            .setDescription("Welcome & leave messages, auto-roles")
            .addSubcommand((s) =>
              s
                .setName("set")
                .setDescription("Turn on welcome messages")
                .addChannelOption((o) => o.setName("channel").setDescription("Where").setRequired(true).addChannelTypes(...TEXT_CHANNELS))
                .addStringOption((o) =>
                  o.setName("message").setDescription("Placeholders: {user} {username} {server} {count}").setMaxLength(1000),
                ),
            )
            .addSubcommand((s) => s.setName("disable").setDescription("Turn off welcome messages"))
            .addSubcommand((s) =>
              s
                .setName("dm")
                .setDescription("Also DM new members")
                .addBooleanOption((o) => o.setName("enabled").setDescription("DM?").setRequired(true))
                .addStringOption((o) => o.setName("message").setDescription("DM text (same placeholders)").setMaxLength(1000)),
            )
            .addSubcommand((s) =>
              s
                .setName("leave")
                .setDescription("Leave messages")
                .addBooleanOption((o) => o.setName("enabled").setDescription("On?").setRequired(true))
                .addChannelOption((o) => o.setName("channel").setDescription("Where (default: welcome channel)").addChannelTypes(...TEXT_CHANNELS))
                .addStringOption((o) => o.setName("message").setDescription("Text (same placeholders)").setMaxLength(1000)),
            )
            .addSubcommand((s) =>
              s.setName("autorole-add").setDescription("Give a role to everyone who joins").addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true)),
            )
            .addSubcommand((s) =>
              s.setName("autorole-remove").setDescription("Stop giving a role on join").addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true)),
            ),
        )
        .addSubcommandGroup((g: Group) =>
          g
            .setName("automod")
            .setDescription("Automatic moderation")
            .addSubcommand((s) =>
              s.setName("enable").setDescription("Turn auto-mod on or off").addBooleanOption((o) => o.setName("enabled").setDescription("On?").setRequired(true)),
            )
            .addSubcommand((s) =>
              s
                .setName("checks")
                .setDescription("Choose what auto-mod looks for")
                .addBooleanOption((o) => o.setName("invites").setDescription("Discord invite links"))
                .addBooleanOption((o) => o.setName("duplicates").setDescription("Same message 3x in 30s"))
                .addBooleanOption((o) => o.setName("caps").setDescription("Mostly capital letters"))
                .addIntegerOption((o) => o.setName("mass_mentions").setDescription("Max mentions per message (0 = off)").setMinValue(0).setMaxValue(50)),
            )
            .addSubcommand((s) =>
              s
                .setName("action")
                .setDescription("What happens to a violation")
                .addStringOption((o) =>
                  o
                    .setName("action")
                    .setDescription("Action")
                    .setRequired(true)
                    .addChoices(
                      { name: "delete the message", value: "delete" },
                      { name: "delete + warn", value: "warn" },
                      { name: "delete + warn + timeout", value: "timeout" },
                    ),
                )
                .addIntegerOption((o) => o.setName("timeout_minutes").setDescription("Timeout length").setMinValue(1).setMaxValue(1440)),
            )
            .addSubcommand((s) =>
              s
                .setName("exempt-role")
                .setDescription("Toggle a role that auto-mod ignores")
                .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true)),
            )
            .addSubcommand((s) =>
              s
                .setName("exempt-channel")
                .setDescription("Toggle a channel that auto-mod ignores")
                .addChannelOption((o) => o.setName("channel").setDescription("Channel").setRequired(true).addChannelTypes(...TEXT_CHANNELS)),
            ),
        )
        .addSubcommandGroup((g: Group) =>
          g
            .setName("modlog")
            .setDescription("Moderation log")
            .addSubcommand((s) =>
              s.setName("channel").setDescription("Where the mod log goes").addChannelOption((o) => o.setName("channel").setDescription("Channel").setRequired(true).addChannelTypes(...TEXT_CHANNELS)),
            )
            .addSubcommand((s) => s.setName("disable").setDescription("Turn off the mod log"))
            .addSubcommand((s) =>
              s
                .setName("events")
                .setDescription("Choose what is logged")
                .addBooleanOption((o) => o.setName("edits").setDescription("Edited messages"))
                .addBooleanOption((o) => o.setName("deletes").setDescription("Deleted messages"))
                .addBooleanOption((o) => o.setName("joins").setDescription("Member joins"))
                .addBooleanOption((o) => o.setName("leaves").setDescription("Member leaves"))
                .addBooleanOption((o) => o.setName("automod").setDescription("Auto-mod actions"))
                .addBooleanOption((o) => o.setName("config").setDescription("Settings changes"))
                .addBooleanOption((o) => o.setName("moderation").setDescription("Warnings and other cases")),
            ),
        )
        .addSubcommandGroup((g: Group) =>
          g
            .setName("previews")
            .setDescription("Link previews (xkcd, GitHub)")
            .addSubcommand((s) =>
              s.setName("enable").setDescription("Turn link previews on or off").addBooleanOption((o) => o.setName("enabled").setDescription("On?").setRequired(true)),
            ),
        )
        .addSubcommandGroup((g: Group) =>
          g
            .setName("starboard")
            .setDescription("Starboard")
            .addSubcommand((s) =>
              s
                .setName("set")
                .setDescription("Turn on the starboard")
                .addChannelOption((o) => o.setName("channel").setDescription("Starboard channel").setRequired(true).addChannelTypes(...TEXT_CHANNELS))
                .addIntegerOption((o) => o.setName("threshold").setDescription("⭐ needed (default 3)").setMinValue(1).setMaxValue(50)),
            )
            .addSubcommand((s) => s.setName("disable").setDescription("Turn off the starboard")),
        )
        .addSubcommandGroup((g: Group) =>
          g
            .setName("confessions")
            .setDescription("Anonymous confessions")
            .addSubcommand((s) =>
              s.setName("set").setDescription("Turn on /confess").addChannelOption((o) => o.setName("channel").setDescription("Where confessions are posted").setRequired(true).addChannelTypes(...TEXT_CHANNELS)),
            )
            .addSubcommand((s) => s.setName("disable").setDescription("Turn off /confess")),
        ),
    );
  }

  public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "zone") return interaction.respond([]);
    return interaction.respond(matchTimeZones(focused.value).map((tz) => ({ name: `${tz} (${utcOffset(tz)})`, value: tz })));
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    await ensureServer(interaction.guild);
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (!group && sub === "view") {
      await interaction.reply({ embeds: [viewEmbed(interaction.client, await getFeatureSettings(interaction.guildId))], flags: ephemeral });
      return;
    }

    try {
      const result = await this.apply(interaction, group ?? "", sub);
      if (typeof result === "string" && !result.startsWith("✅")) {
        await interaction.reply({ content: result, flags: ephemeral });
        return;
      }
      await interaction.reply({ content: result, flags: ephemeral });
      await sendModlog(
        interaction.guild,
        "config",
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("Settings changed")
          .setDescription(truncate(`/config ${group} ${sub}\n${result}`, 1000))
          .addFields({ name: "By", value: `<@${interaction.user.id}>` }),
      );
    } catch (err) {
      if (err instanceof SettingsValidationError) {
        await interaction.reply({ content: `❌ ${err.issues.join("\n")}`, flags: ephemeral });
        return;
      }
      throw err;
    }
  }

  /** Returns a message starting with ✅ on success, or an explanation of why not. */
  private async apply(i: Command.ChatInputCommandInteraction<"cached">, group: string, sub: string): Promise<string> {
    const g = i.guildId;
    const s = await getFeatureSettings(g);
    const o = i.options;
    const set = async <K extends SectionName>(section: K, patch: Partial<ServerSettings[K]>) => {
      await updateSettings(g, section, patch);
    };
    const roleCheck = (role: Role) => roleAssignProblem(role, i.member);

    switch (`${group}/${sub}`) {
      // ---- server-wide
      case "/timezone": {
        const zone = o.getString("zone", true).trim();
        await set("general", { timezone: zone });
        return `✅ This server's time zone is now **${zone}** (currently ${utcOffset(zone)}).`;
      }
      // ---- levels
      case "levels/enable":
        await set("levels", { enabled: o.getBoolean("enabled", true) });
        return `✅ Levels are now **${onOff(o.getBoolean("enabled", true))}**.`;
      case "levels/announce": {
        const where = o.getString("where", true) as ServerSettings["levels"]["announce"];
        const channel = o.getChannel("channel", false, [...TEXT_CHANNELS]);
        if (where === "channel" && !channel) return "Pick a `channel` for that option.";
        await set("levels", { announce: where, announceChannelId: channel?.id ?? null });
        return `✅ Level-ups will be announced: **${where}**${channel ? ` in <#${channel.id}>` : ""}.`;
      }
      case "levels/reward-add": {
        const role = o.getRole("role", true);
        const problem = roleCheck(role);
        if (problem) return `❌ ${problem}`;
        const level = o.getInteger("level", true);
        const rewards = [...s.levels.roleRewards.filter((r) => r.level !== level), { level, roleId: role.id }];
        await set("levels", { roleRewards: rewards.sort((a, b) => a.level - b.level) });
        return `✅ Members reaching level **${level}** will get <@&${role.id}>.`;
      }
      case "levels/reward-remove": {
        const level = o.getInteger("level", true);
        await set("levels", { roleRewards: s.levels.roleRewards.filter((r) => r.level !== level) });
        return `✅ Removed the level ${level} reward.`;
      }
      case "levels/stack":
        await set("levels", { stackRewards: o.getBoolean("enabled", true) });
        return `✅ Reward stacking is **${onOff(o.getBoolean("enabled", true))}**.`;

      // ---- counting
      case "counting/mode":
        await set("counting", { mode: o.getString("mode", true) as "classic" | "reset" });
        return `✅ Counting mode is now **${o.getString("mode", true)}**.`;
      case "counting/math":
        await set("counting", { allowMath: o.getBoolean("enabled", true) });
        return `✅ Maths in counting is **${onOff(o.getBoolean("enabled", true))}**.`;

      // ---- welcome
      case "welcome/set": {
        const channel = o.getChannel("channel", true, [...TEXT_CHANNELS]);
        const message = o.getString("message") ?? undefined;
        await set("welcome", { enabled: true, channelId: channel.id, ...(message ? { message } : {}) });
        return `✅ Welcome messages will be posted in <#${channel.id}>.`;
      }
      case "welcome/disable":
        await set("welcome", { enabled: false });
        return "✅ Welcome messages are off.";
      case "welcome/dm": {
        const message = o.getString("message") ?? undefined;
        await set("welcome", { dmEnabled: o.getBoolean("enabled", true), ...(message ? { dmMessage: message } : {}) });
        return `✅ Welcome DMs are **${onOff(o.getBoolean("enabled", true))}**.`;
      }
      case "welcome/leave": {
        const channel = o.getChannel("channel", false, [...TEXT_CHANNELS]);
        const message = o.getString("message") ?? undefined;
        await set("welcome", {
          leaveEnabled: o.getBoolean("enabled", true),
          ...(channel ? { leaveChannelId: channel.id } : {}),
          ...(message ? { leaveMessage: message } : {}),
        });
        return `✅ Leave messages are **${onOff(o.getBoolean("enabled", true))}**.`;
      }
      case "welcome/autorole-add": {
        const role = o.getRole("role", true);
        const problem = roleCheck(role);
        if (problem) return `❌ ${problem}`;
        if (s.welcome.autoRoleIds.includes(role.id)) return `<@&${role.id}> is already an auto-role.`;
        if (s.welcome.autoRoleIds.length >= 5) return "❌ You can have at most 5 auto-roles.";
        await set("welcome", { autoRoleIds: [...s.welcome.autoRoleIds, role.id] });
        return `✅ New members will get <@&${role.id}>.`;
      }
      case "welcome/autorole-remove": {
        const role = o.getRole("role", true);
        await set("welcome", { autoRoleIds: s.welcome.autoRoleIds.filter((r) => r !== role.id) });
        return `✅ <@&${role.id}> is no longer given on join.`;
      }

      // ---- automod
      case "automod/enable":
        await set("automod", { enabled: o.getBoolean("enabled", true) });
        return `✅ Auto-mod is **${onOff(o.getBoolean("enabled", true))}**.`;
      case "automod/checks": {
        const patch = {
          ...(o.getBoolean("invites") !== null ? { invites: o.getBoolean("invites") as boolean } : {}),
          ...(o.getBoolean("duplicates") !== null ? { duplicates: o.getBoolean("duplicates") as boolean } : {}),
          ...(o.getBoolean("caps") !== null ? { caps: o.getBoolean("caps") as boolean } : {}),
          ...(o.getInteger("mass_mentions") !== null ? { massMentions: o.getInteger("mass_mentions") as number } : {}),
        };
        if (Object.keys(patch).length === 0) return "Choose at least one check to change.";
        await set("automod", patch);
        return "✅ Auto-mod checks updated.";
      }
      case "automod/action": {
        const action = o.getString("action", true) as "delete" | "warn" | "timeout";
        const minutes = o.getInteger("timeout_minutes");
        if (action === "timeout" && !i.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          return "❌ I need the **Timeout Members** permission for that.";
        }
        await set("automod", { action, ...(minutes ? { timeoutMinutes: minutes } : {}) });
        return `✅ Auto-mod action: **${action}**${action === "timeout" ? ` (${minutes ?? s.automod.timeoutMinutes} min)` : ""}.`;
      }
      case "automod/exempt-role": {
        const role = o.getRole("role", true);
        const has = s.automod.exemptRoleIds.includes(role.id);
        await set("automod", {
          exemptRoleIds: has ? s.automod.exemptRoleIds.filter((r) => r !== role.id) : [...s.automod.exemptRoleIds, role.id],
        });
        return `✅ <@&${role.id}> is ${has ? "no longer" : "now"} exempt from auto-mod.`;
      }
      case "automod/exempt-channel": {
        const channel = o.getChannel("channel", true, [...TEXT_CHANNELS]);
        const has = s.automod.exemptChannelIds.includes(channel.id);
        await set("automod", {
          exemptChannelIds: has ? s.automod.exemptChannelIds.filter((c) => c !== channel.id) : [...s.automod.exemptChannelIds, channel.id],
        });
        return `✅ <#${channel.id}> is ${has ? "no longer" : "now"} exempt from auto-mod.`;
      }

      // ---- modlog
      case "modlog/channel": {
        const channel = o.getChannel("channel", true, [...TEXT_CHANNELS]);
        await set("modlog", { channelId: channel.id });
        return `✅ The mod log will be posted in <#${channel.id}>. Make sure only moderators can read it: it shows edited and deleted message text.`;
      }
      case "modlog/disable":
        await set("modlog", { channelId: null });
        return "✅ The mod log is off.";
      case "modlog/events": {
        const keys = ["edits", "deletes", "joins", "leaves", "automod", "config", "moderation"] as const;
        const patch = Object.fromEntries(
          keys.filter((k) => o.getBoolean(k) !== null).map((k) => [k, o.getBoolean(k) as boolean]),
        );
        if (Object.keys(patch).length === 0) return "Choose at least one event type to change.";
        await set("modlog", patch);
        return "✅ Mod log events updated.";
      }

      // ---- previews / starboard / confessions
      case "previews/enable":
        await set("linkPreviews", { enabled: o.getBoolean("enabled", true) });
        return `✅ Link previews are **${onOff(o.getBoolean("enabled", true))}**.`;
      case "starboard/set": {
        const channel = o.getChannel("channel", true, [...TEXT_CHANNELS]);
        const threshold = o.getInteger("threshold");
        await set("starboard", { channelId: channel.id, ...(threshold ? { threshold } : {}) });
        return `✅ Messages with **${threshold ?? s.starboard.threshold}** ⭐ will be posted in <#${channel.id}>.`;
      }
      case "starboard/disable":
        await set("starboard", { channelId: null });
        return "✅ The starboard is off.";
      case "confessions/set": {
        if (!this.container.config.CONFESSION_SECRET) return "❌ Confessions aren't available on this bot (no confession key configured).";
        const channel = o.getChannel("channel", true, [...TEXT_CHANNELS]);
        await set("confessions", { channelId: channel.id });
        return `✅ Anonymous confessions will be posted in <#${channel.id}>. Members use \`/confess\`.`;
      }
      case "confessions/disable":
        await set("confessions", { channelId: null });
        return "✅ Confessions are off.";
      default:
        return "Unknown setting.";
    }
  }
}

function viewEmbed(client: Command.ChatInputCommandInteraction["client"], s: ServerSettings) {
  const lv = s.levels;
  const am = s.automod;
  const ml = s.modlog;
  const w = s.welcome;
  return brandEmbed(client)
    .setTitle("Server settings")
    .addFields(
      { name: "🕒 Time zone", value: `${s.general.timezone} (${utcOffset(s.general.timezone)}) · \`/config timezone\`` },
      {
        name: "📈 Levels",
        value:
          `**${onOff(lv.enabled)}** · announce: ${lv.announce}${lv.announce === "channel" ? ` ${ch(lv.announceChannelId)}` : ""}\n` +
          `rewards: ${lv.roleRewards.map((r) => `L${r.level} <@&${r.roleId}>`).join(", ") || "none"} · stack: ${onOff(lv.stackRewards)}
` +
          `no-XP: ${lv.noXpChannelIds.length + lv.noXpRoleIds.length} · multipliers: ${lv.roleMultipliers.length + lv.channelMultipliers.length} (see \`/xp rules\`)`,
      },
      { name: "🔢 Counting", value: `mode: **${s.counting.mode}** · maths: ${onOff(s.counting.allowMath)}` },
      {
        name: "👋 Welcome",
        value:
          `welcome: **${onOff(w.enabled)}** ${ch(w.channelId)} · DM: ${onOff(w.dmEnabled)} · leave: ${onOff(w.leaveEnabled)} ${ch(w.leaveChannelId ?? w.channelId)}\n` +
          `auto-roles: ${w.autoRoleIds.map((r) => `<@&${r}>`).join(", ") || "none"}`,
      },
      {
        name: "🛡️ Auto-mod",
        value:
          `**${onOff(am.enabled)}** · action: ${am.action}${am.action === "timeout" ? ` (${am.timeoutMinutes}m)` : ""}\n` +
          `invites: ${onOff(am.invites)} · duplicates: ${onOff(am.duplicates)} · caps: ${onOff(am.caps)} · mentions: ${am.massMentions || "off"}\n` +
          `exempt: ${[...am.exemptRoleIds.map((r) => `<@&${r}>`), ...am.exemptChannelIds.map((c) => `<#${c}>`)].join(", ") || "none"}`,
      },
      {
        name: "📜 Mod log",
        value: ml.channelId
          ? `${ch(ml.channelId)} · ${(["edits", "deletes", "joins", "leaves", "automod", "config", "moderation"] as const).filter((k) => ml[k]).join(", ")}`
          : "off",
      },
      { name: "🔗 Link previews", value: onOff(s.linkPreviews.enabled), inline: true },
      { name: "⭐ Starboard", value: s.starboard.channelId ? `${ch(s.starboard.channelId)} (${s.starboard.threshold}⭐)` : "off", inline: true },
      { name: "🤫 Confessions", value: s.confessions.channelId ? ch(s.confessions.channelId) : "off", inline: true },
      {
        name: "⚠️ Warnings",
        value:
          `DM members: ${onOff(s.warnings.dmMembers)} · escalate: ${s.warnings.escalateAt ? `every ${s.warnings.escalateAt} → ${s.warnings.escalateAction}` : "never"}` +
          ` · expire: ${s.warnings.expireDays ? `${s.warnings.expireDays}d` : "never"} (\`/case settings\`)`,
      },
      {
        name: "🎂 Birthdays",
        value: s.birthdays.channelId
          ? `${ch(s.birthdays.channelId)} at ${String(s.birthdays.hour).padStart(2, "0")}:00 ${s.general.timezone}${s.birthdays.roleId ? ` · role <@&${s.birthdays.roleId}>` : ""}`
          : "off (`/birthday setup`)",
      },
      {
        name: "💡 Suggestions",
        value: s.suggestions.channelId ? `${ch(s.suggestions.channelId)} · threads: ${onOff(s.suggestions.threads)}` : "off",
        inline: true,
      },
      {
        name: "🎫 Tickets",
        value: s.tickets.categoryId
          ? `staff: ${s.tickets.staffRoleIds.map((r) => `<@&${r}>`).join(", ") || "none"} · log: ${ch(s.tickets.logChannelId)}`
          : "off (`/ticket setup`)",
        inline: true,
      },
    );
}
