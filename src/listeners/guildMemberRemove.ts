import { Events, Listener } from "@sapphire/framework";
import { EmbedBuilder, time, type GuildMember, type PartialGuildMember } from "discord.js";
import { gate } from "../lib/services/gate.js";
import { sendModlog } from "../lib/services/modlog.js";
import { queueMemberCount } from "../lib/services/servers.js";
import { getFeatureSettings, renderTemplate } from "../lib/services/settings.js";

export class GuildMemberRemoveListener extends Listener<typeof Events.GuildMemberRemove> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildMemberRemove });
  }

  public override async run(member: GuildMember | PartialGuildMember) {
    if (await gate.isIgnored(member.guild.id)) return;
    queueMemberCount(member.guild.id, member.guild.memberCount);
    if (member.user.bot) return;

    const w = (await getFeatureSettings(member.guild.id)).welcome;
    await Promise.allSettled([
      (async () => {
        if (!w.leaveEnabled) return;
        const channelId = w.leaveChannelId ?? w.channelId;
        const ch = channelId ? member.guild.channels.cache.get(channelId) : undefined;
        if (!ch?.isSendable()) return;
        const content = renderTemplate(w.leaveMessage, {
          userId: member.id,
          username: member.user.username,
          server: member.guild.name,
          memberCount: member.guild.memberCount,
        });
        await ch.send({ content, allowedMentions: { parse: [] } }); // they've left: never ping them
      })(),
      sendModlog(
        member.guild,
        "leaves",
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Member left")
          .setThumbnail(member.user.displayAvatarURL())
          .setDescription(`<@${member.id}> (${member.user.tag})`)
          .addFields({ name: "Joined", value: member.joinedAt ? time(member.joinedAt, "R") : "unknown" }),
      ),
    ]);
  }
}
