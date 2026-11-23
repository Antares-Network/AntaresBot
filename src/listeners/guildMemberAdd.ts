import { Events, Listener } from "@sapphire/framework";
import { EmbedBuilder, time, type GuildMember } from "discord.js";
import { roleAssignProblem } from "../lib/features/roleSafety.js";
import { gate } from "../lib/services/gate.js";
import { sendModlog } from "../lib/services/modlog.js";
import { queueMemberCount } from "../lib/services/servers.js";
import { getFeatureSettings, renderTemplate } from "../lib/services/settings.js";

export class GuildMemberAddListener extends Listener<typeof Events.GuildMemberAdd> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildMemberAdd });
  }

  public override async run(member: GuildMember) {
    if (await gate.isIgnored(member.guild.id)) return;
    queueMemberCount(member.guild.id, member.guild.memberCount);
    if (member.user.bot) return;

    const w = (await getFeatureSettings(member.guild.id)).welcome;
    const ctx = {
      userId: member.id,
      username: member.user.username,
      server: member.guild.name,
      memberCount: member.guild.memberCount,
    };

    const results = await Promise.allSettled([
      // Welcome message: may ping only the new member, never @everyone or roles.
      (async () => {
        if (!w.enabled || !w.channelId) return;
        const ch = member.guild.channels.cache.get(w.channelId);
        if (ch?.isSendable()) {
          await ch.send({ content: renderTemplate(w.message, ctx), allowedMentions: { users: [member.id] } });
        }
      })(),
      (async () => {
        if (w.enabled && w.dmEnabled) {
          await member.send({ content: renderTemplate(w.dmMessage, ctx), allowedMentions: { parse: [] } });
        }
      })(),
      // Auto-roles, each re-checked at grant time so a role later edited to gain
      // moderator/admin permissions is never handed out.
      (async () => {
        for (const roleId of w.autoRoleIds) {
          const role = member.guild.roles.cache.get(roleId);
          if (!role) continue;
          const problem = roleAssignProblem(role);
          if (problem) {
            this.container.logger.warn(`Auto-role skipped in ${member.guild.id}: ${problem}`);
            continue;
          }
          await member.roles.add(role, "Auto-role on join");
        }
      })(),
      sendModlog(
        member.guild,
        "joins",
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("Member joined")
          .setThumbnail(member.user.displayAvatarURL())
          .setDescription(`<@${member.id}> (${member.user.tag})`)
          .addFields({ name: "Account created", value: time(member.user.createdAt, "R") }),
      ),
    ]);
    for (const r of results) {
      // DMs being closed is normal; anything else is worth a debug line.
      if (r.status === "rejected") this.container.logger.debug(`guildMemberAdd step failed in ${member.guild.id}:`, r.reason);
    }
  }
}
