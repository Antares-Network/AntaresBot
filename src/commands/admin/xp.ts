import { Command } from "@sapphire/framework";
import { ChannelType, PermissionFlagsBits } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { applyRoleRewards } from "../../lib/services/levelUp.js";
import { adjustXp } from "../../lib/services/members.js";
import { ensureServer } from "../../lib/services/servers.js";
import { getFeatureSettings, SettingsValidationError, updateSettings } from "../../lib/services/settings.js";

const XP_CHANNELS = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildCategory,
  ChannelType.GuildVoice,
  ChannelType.GuildForum,
] as const;
const round1 = (n: number) => Math.round(n * 10) / 10;

export class XpCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "xp",
      description: "Manage member XP and XP rules",
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((s) =>
          s
            .setName("give")
            .setDescription("Give a member XP")
            .addUserOption((o) => o.setName("member").setDescription("Who").setRequired(true))
            .addIntegerOption((o) =>
              o.setName("amount").setDescription("How much").setRequired(true).setMinValue(1).setMaxValue(1_000_000),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("take")
            .setDescription("Take XP from a member")
            .addUserOption((o) => o.setName("member").setDescription("Who").setRequired(true))
            .addIntegerOption((o) =>
              o.setName("amount").setDescription("How much").setRequired(true).setMinValue(1).setMaxValue(1_000_000),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("set")
            .setDescription("Set a member's XP exactly")
            .addUserOption((o) => o.setName("member").setDescription("Who").setRequired(true))
            .addIntegerOption((o) =>
              o.setName("amount").setDescription("New XP total").setRequired(true).setMinValue(0).setMaxValue(100_000_000),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("reset")
            .setDescription("Reset a member's XP to 0")
            .addUserOption((o) => o.setName("member").setDescription("Who").setRequired(true)),
        )
        .addSubcommand((s) =>
          s
            .setName("no-xp-channel")
            .setDescription("Toggle a channel or category where nobody earns XP")
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("Channel or category")
                .setRequired(true)
                .addChannelTypes(...XP_CHANNELS),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("no-xp-role")
            .setDescription("Toggle a role that never earns XP")
            .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true)),
        )
        .addSubcommand((s) =>
          s
            .setName("role-multiplier")
            .setDescription("XP multiplier for a role (1 removes it)")
            .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true))
            .addNumberOption((o) => o.setName("multiplier").setDescription("0.1 – 5").setRequired(true).setMinValue(0.1).setMaxValue(5)),
        )
        .addSubcommand((s) =>
          s
            .setName("channel-multiplier")
            .setDescription("XP multiplier for a channel or category (1 removes it)")
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("Channel or category")
                .setRequired(true)
                .addChannelTypes(...XP_CHANNELS),
            )
            .addNumberOption((o) => o.setName("multiplier").setDescription("0.1 – 5").setRequired(true).setMinValue(0.1).setMaxValue(5)),
        )
        .addSubcommand((s) => s.setName("rules").setDescription("Show the XP rules")),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const sub = interaction.options.getSubcommand();
    const g = interaction.guildId;
    const o = interaction.options;
    const reply = (content: string) => interaction.reply({ content, flags: ephemeral, allowedMentions: { parse: [] } });
    await ensureServer(interaction.guild);

    if (["give", "take", "set", "reset"].includes(sub)) {
      const user = o.getUser("member", true);
      if (user.bot) {
        await reply("❌ Bots don't earn XP.");
        return;
      }
      const amount = o.getInteger("amount") ?? 0;
      const change = sub === "give" ? { add: amount } : sub === "take" ? { add: -amount } : { set: sub === "set" ? amount : 0 };
      const r = await adjustXp(g, user.id, change);
      let rewards = "";
      if (r.level > r.previousLevel) {
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        const cfg = (await getFeatureSettings(g)).levels;
        const granted = member ? await applyRoleRewards(member, r.level, cfg) : [];
        if (granted.length) rewards = ` New reward role(s): ${granted.map((id) => `<@&${id}>`).join(", ")}.`;
      }
      {
        await reply(`✅ <@${user.id}> now has **${r.xp.toLocaleString("en-US")} XP** (level ${r.level}).${rewards}`);
        return;
      }
    }

    if (sub === "rules") {
      const c = (await getFeatureSettings(g)).levels;
      const list = (xs: string[]) => xs.join(", ") || "none";
      await interaction.reply({
        embeds: [
          brandEmbed(interaction.client)
            .setTitle("XP rules")
            .addFields(
              { name: "Levels", value: c.enabled ? "on" : "off (turn on with `/config levels enable`)" },
              { name: "No-XP channels", value: list(c.noXpChannelIds.map((id) => `<#${id}>`)) },
              { name: "No-XP roles", value: list(c.noXpRoleIds.map((id) => `<@&${id}>`)) },
              { name: "Role multipliers", value: list(c.roleMultipliers.map((r) => `<@&${r.roleId}> ×${r.multiplier}`)) },
              { name: "Channel multipliers", value: list(c.channelMultipliers.map((r) => `<#${r.channelId}> ×${r.multiplier}`)) },
            ),
        ],
        flags: ephemeral,
        allowedMentions: { parse: [] },
      });
      return;
    }

    try {
      let msg = "";
      switch (sub) {
        case "no-xp-channel": {
          const id = o.getChannel("channel", true).id;
          await updateSettings(g, "levels", (c) => {
            const has = c.noXpChannelIds.includes(id);
            msg = `✅ <#${id}> ${has ? "earns XP again" : "no longer earns XP"}.`;
            return { noXpChannelIds: has ? c.noXpChannelIds.filter((x) => x !== id) : [...c.noXpChannelIds, id] };
          });
          break;
        }
        case "no-xp-role": {
          const id = o.getRole("role", true).id;
          await updateSettings(g, "levels", (c) => {
            const has = c.noXpRoleIds.includes(id);
            msg = `✅ <@&${id}> ${has ? "earns XP again" : "no longer earns XP"}.`;
            return { noXpRoleIds: has ? c.noXpRoleIds.filter((x) => x !== id) : [...c.noXpRoleIds, id] };
          });
          break;
        }
        case "role-multiplier": {
          const roleId = o.getRole("role", true).id;
          const multiplier = round1(o.getNumber("multiplier", true));
          await updateSettings(g, "levels", (c) => ({
            roleMultipliers: [
              ...c.roleMultipliers.filter((r) => r.roleId !== roleId),
              ...(multiplier === 1 ? [] : [{ roleId, multiplier }]),
            ],
          }));
          msg = multiplier === 1 ? `✅ Removed the multiplier for <@&${roleId}>.` : `✅ <@&${roleId}> earns **×${multiplier}** XP.`;
          break;
        }
        case "channel-multiplier": {
          const channelId = o.getChannel("channel", true).id;
          const multiplier = round1(o.getNumber("multiplier", true));
          await updateSettings(g, "levels", (c) => ({
            channelMultipliers: [
              ...c.channelMultipliers.filter((r) => r.channelId !== channelId),
              ...(multiplier === 1 ? [] : [{ channelId, multiplier }]),
            ],
          }));
          msg = multiplier === 1 ? `✅ Removed the multiplier for <#${channelId}>.` : `✅ <#${channelId}> earns **×${multiplier}** XP.`;
          break;
        }
      }
      await reply(msg || "Unknown option.");
    } catch (err) {
      if (err instanceof SettingsValidationError) {
        await reply(`❌ ${err.issues.join("\n")}`);
        return;
      }
      throw err;
    }
  }
}
