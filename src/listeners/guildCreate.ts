import { Events, Listener } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, type Guild, type TextChannel } from "discord.js";
import { DEFAULT_AVATAR, inviteUrl, SLASH_FAQ_URL, SUPPORT_SERVER_URL } from "../lib/constants.js";
import { brandEmbed } from "../lib/embeds.js";
import { report } from "../lib/reporting.js";
import { ensureServer } from "../lib/services/servers.js";

export class GuildCreateListener extends Listener<typeof Events.GuildCreate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildCreate });
  }

  public override async run(guild: Guild) {
    const client = guild.client;
    await ensureServer(guild);
    this.container.logger.info(`Joined a new server: ${guild.name} (${guild.id})`);

    const owner = await guild.fetchOwner().catch(() => null);
    await report(client, {
      embeds: [
        brandEmbed(client)
          .setTitle("I joined a new Server")
          .setThumbnail(guild.iconURL() ?? DEFAULT_AVATAR)
          .addFields(
            { name: "Guild Creation Date:", value: guild.createdAt.toString() },
            { name: "Guild Join Date:", value: new Date().toString() },
            { name: "Guild Name:", value: guild.name },
            { name: "Guild ID:", value: guild.id },
            { name: "Owner Name:", value: owner?.user.tag ?? "unknown" },
            { name: "Owner ID:", value: guild.ownerId },
            { name: "Guild Member Count:", value: guild.memberCount.toString() },
          ),
      ],
    });

    // Welcome message in the top-most text channel the bot can actually post in.
    const me = guild.members.me;
    const first = guild.channels.cache
      .filter((c): c is TextChannel => c.type === ChannelType.GuildText)
      .filter((c) => (me ? c.permissionsFor(me).has(["ViewChannel", "SendMessages", "EmbedLinks"]) : false))
      .sort((a, b) => a.position - b.position)
      .first();
    if (!first) return;

    const welcome = brandEmbed(client)
      .setTitle("Thank you for inviting me to your server")
      .setThumbnail(guild.iconURL() ?? DEFAULT_AVATAR)
      .addFields(
        {
          name: "Getting started",
          value: `All commands are slash commands. You can learn more about how to use Slash/Application commands [here](${SLASH_FAQ_URL}).\nA server manager should run \`/setup\` to choose the bot channel.`,
        },
        { name: "Commands/ help", value: "Please run `/help` to see a list of commands" },
      );
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setURL(inviteUrl(client.user.id)).setLabel("Invite Me").setStyle(ButtonStyle.Link),
      new ButtonBuilder().setURL(SUPPORT_SERVER_URL).setLabel("Support Server").setStyle(ButtonStyle.Link),
    );
    await first.send({ embeds: [welcome], components: [row] });
  }
}
