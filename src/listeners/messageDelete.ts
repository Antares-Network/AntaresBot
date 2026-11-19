import { Events, Listener } from "@sapphire/framework";
import { EmbedBuilder, type Message, type PartialMessage } from "discord.js";
import { truncate } from "../lib/embeds.js";
import { gate } from "../lib/services/gate.js";
import { sendModlog } from "../lib/services/modlog.js";

/**
 * Mod log: deleted messages. Text comes from Discord's in-memory cache when available;
 * nothing is stored. Messages sent before the last restart arrive as partials (no text).
 */
export class MessageDeleteListener extends Listener<typeof Events.MessageDelete> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.MessageDelete });
  }

  public override async run(message: Message | PartialMessage) {
    // Check `partial` before narrowing: inGuild()'s type guard assumes a full message.
    const cached = message.partial ? null : message;
    const guild = message.guild;
    if (!guild || message.webhookId || cached?.author.bot) return;
    if (await gate.isIgnored(guild.id)) return;

    const fields = [{ name: "Channel", value: `<#${message.channelId}>`, inline: true }];
    if (cached) {
      fields.push(
        { name: "Author", value: `<@${cached.author.id}> (${cached.author.id})`, inline: true },
        { name: "Content", value: truncate(cached.content || "*(no text)*", 1000), inline: false },
      );
      if (cached.attachments.size > 0) fields.push({ name: "Attachments", value: `${cached.attachments.size} file(s)`, inline: false });
    } else {
      fields.push({ name: "Content", value: "*(not cached — sent before the bot last restarted)*", inline: false });
    }
    await sendModlog(guild, "deletes", new EmbedBuilder().setColor(0x95a5a6).setTitle("Message deleted").addFields(fields));
  }
}
