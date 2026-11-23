import { Events, Listener } from "@sapphire/framework";
import {
  EmbedBuilder,
  type MessageReaction,
  type PartialMessageReaction,
  type PartialUser,
  type User,
} from "discord.js";
import { truncate } from "../lib/embeds.js";
import { safeImageUrl } from "../lib/http.js";
import { gate } from "../lib/services/gate.js";
import { getFeatureSettings } from "../lib/services/settings.js";
import { setStarboardMessage, updateStars } from "../lib/services/starboard.js";

const STAR = "⭐";

/** Shared by the add and remove listeners: recount stars and create/update the starboard post. */
export async function handleStarReaction(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
  if (reaction.emoji.name !== STAR || user.bot) return;
  if (reaction.partial) reaction = await reaction.fetch();
  const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
  if (!message.inGuild() || message.author.bot) return;
  if (await gate.isIgnored(message.guildId)) return;

  const cfg = (await getFeatureSettings(message.guildId)).starboard;
  if (!cfg.channelId || message.channelId === cfg.channelId) return;

  // Count stars, excluding the author starring their own message.
  const users = await reaction.users.fetch();
  const stars = users.filter((u) => !u.bot && u.id !== message.author.id).size;

  const { entry, claim } = await updateStars(message.id, message.guildId, message.channelId, stars);
  const board = message.guild.channels.cache.get(cfg.channelId);
  if (!board?.isSendable()) return;
  const label = `${STAR} **${stars}** | <#${message.channelId}>`;

  if (entry.starboardMessageId) {
    const posted = await board.messages.fetch(entry.starboardMessageId).catch(() => null);
    await posted?.edit({ content: label, allowedMentions: { parse: [] } }).catch(() => undefined);
    return;
  }
  if (!claim || stars < cfg.threshold) {
    if (claim) await setStarboardMessage(message.id, null); // not enough stars yet: release the claim
    return;
  }

  const image = message.attachments.find((a) => a.contentType?.startsWith("image/"));
  const embed = new EmbedBuilder()
    .setColor(0xffac33)
    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
    .setDescription(truncate(message.content || "*(no text)*", 4000))
    .addFields({ name: "Source", value: `[Jump to message](${message.url})` })
    .setTimestamp(message.createdAt);
  const img = image ? safeImageUrl(image.url, ["discordapp.com", "discordapp.net"]) : null;
  if (img) embed.setImage(img);
  try {
    const posted = await board.send({ content: label, embeds: [embed], allowedMentions: { parse: [] } });
    await setStarboardMessage(message.id, posted.id);
  } catch {
    await setStarboardMessage(message.id, null);
  }
}

export class StarboardReactionAddListener extends Listener<typeof Events.MessageReactionAdd> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.MessageReactionAdd });
  }
  public override async run(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    await handleStarReaction(reaction, user);
  }
}
