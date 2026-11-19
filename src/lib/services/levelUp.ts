import { container } from "@sapphire/framework";
import type { GuildMember, Message } from "discord.js";
import { roleAssignProblem } from "../features/roleSafety.js";
import type { Section } from "./settings.js";

/**
 * Apply level role rewards. Every role is re-checked with roleAssignProblem at grant time
 * (a role's permissions may have changed since it was configured), so a reward can never
 * hand out moderator/admin permissions.
 */
export async function applyRoleRewards(member: GuildMember, level: number, cfg: Section<"levels">): Promise<string[]> {
  const earned = cfg.roleRewards.filter((r) => r.level <= level).sort((a, b) => a.level - b.level);
  if (earned.length === 0) return [];
  const keep = cfg.stackRewards ? earned : earned.slice(-1);
  const drop = cfg.stackRewards ? [] : earned.slice(0, -1);
  const granted: string[] = [];

  for (const r of keep) {
    const role = member.guild.roles.cache.get(r.roleId);
    if (!role || member.roles.cache.has(role.id)) continue;
    const problem = roleAssignProblem(role);
    if (problem) {
      container.logger.warn(`Level reward skipped in ${member.guild.id}: ${problem}`);
      continue;
    }
    await member.roles.add(role, `Level ${level} reward`).then(
      () => granted.push(role.id),
      () => undefined,
    );
  }
  for (const r of drop) {
    const role = member.guild.roles.cache.get(r.roleId);
    if (role && member.roles.cache.has(role.id) && !roleAssignProblem(role)) {
      await member.roles.remove(role, "Replaced by a higher level reward").catch(() => undefined);
    }
  }
  return granted;
}

export async function announceLevelUp(message: Message<true>, level: number, cfg: Section<"levels">, rewards: string[]) {
  const text =
    `🎉 <@${message.author.id}> reached **level ${level}**!` +
    (rewards.length ? ` New role${rewards.length > 1 ? "s" : ""}: ${rewards.map((r) => `<@&${r}>`).join(", ")}` : "");
  // Ping only the member who levelled up; reward roles are shown but never pinged.
  const allowedMentions = { users: [message.author.id], roles: [] as string[] };
  switch (cfg.announce) {
    case "off":
      return;
    case "dm":
      await message.author.send({ content: `${text} (in **${message.guild.name}**)`, allowedMentions }).catch(() => undefined);
      return;
    case "channel": {
      const ch = cfg.announceChannelId ? message.guild.channels.cache.get(cfg.announceChannelId) : undefined;
      if (ch?.isSendable()) {
        await ch.send({ content: text, allowedMentions }).catch(() => undefined);
        return;
      }
      break; // configured channel gone: fall back to the same channel
    }
    default:
      break;
  }
  await message.channel.send({ content: text, allowedMentions }).catch(() => undefined);
}
