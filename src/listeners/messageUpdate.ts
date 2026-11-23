import { Events, Listener } from "@sapphire/framework";
import { EmbedBuilder, type Message, type PartialMessage } from "discord.js";
import { truncate } from "../lib/embeds.js";
import { gate } from "../lib/services/gate.js";
import { sendModlog } from "../lib/services/modlog.js";

/** Mod log: edited messages. Text comes from Discord's cache; nothing is stored. */
export class MessageUpdateListener extends Listener<typeof Events.MessageUpdate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.MessageUpdate });
  }

  public override async run(before: Message | PartialMessage, after: Message | PartialMessage) {
    if (!after.inGuild() || after.author.bot || after.webhookId) return;
    // Embed unfurls also fire updates; only real text changes matter.
    if (before.partial || before.content === after.content) return;
    if (await gate.isIgnored(after.guildId)) return;
    await sendModlog(
      after.guild,
      "edits",
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("Message edited")
        .setURL(after.url)
        .addFields(
          { name: "Author", value: `<@${after.author.id}> (${after.author.id})`, inline: true },
          { name: "Channel", value: `<#${after.channelId}>`, inline: true },
          { name: "Before", value: truncate(before.content || "*(empty)*", 1000) },
          { name: "After", value: truncate(after.content || "*(empty)*", 1000) },
        ),
    );
  }
}
