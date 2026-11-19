import { container } from "@sapphire/framework";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  LabelBuilder,
  ModalBuilder,
  OverwriteType,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  time,
  type Guild,
  type GuildMember,
  type GuildTextBasedChannel,
  type OverwriteResolvable,
} from "discord.js";
import mongoose from "mongoose";
import { TicketModel } from "../db/models.js";
import { truncate } from "../embeds.js";
import { nextSeq } from "./servers.js";
import { getFeatureSettings, type Section } from "./settings.js";

export const TICKET_PREFIX = "tk:";
export const TICKET_OPEN_ID = `${TICKET_PREFIX}open`;
export const TICKET_MODAL_ID = `${TICKET_PREFIX}modal`;
export const TICKET_CLOSE_ID = `${TICKET_PREFIX}close`;

const MEMBER_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks,
];

/** Permissions the bot needs to run tickets in a category. */
export const TICKET_BOT_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.SendMessages,
];

export function panelRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(TICKET_OPEN_ID).setLabel("Open a ticket").setEmoji("🎫").setStyle(ButtonStyle.Primary),
  );
}

export function openModal() {
  return new ModalBuilder()
    .setCustomId(TICKET_MODAL_ID)
    .setTitle("Open a support ticket")
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("What do you need help with?")
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId("subject")
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(3)
            .setMaxLength(500)
            .setRequired(true),
        ),
    );
}

export function isStaff(member: GuildMember, cfg: Section<"tickets">): boolean {
  return member.permissions.has(PermissionFlagsBits.ManageChannels) || cfg.staffRoleIds.some((r) => member.roles.cache.has(r));
}

// Double-clicks must not open two tickets.
const opening = new Set<string>();

export type OpenResult = { ok: true; channelId: string; number: number } | { ok: false; reason: string };

/** Open a ticket channel for `member`. The subject is posted in the channel, never stored. */
export async function openTicket(member: GuildMember, subject: string): Promise<OpenResult> {
  const guild = member.guild;
  const cfg = (await getFeatureSettings(guild.id)).tickets;
  const category = cfg.categoryId ? guild.channels.cache.get(cfg.categoryId) : undefined;
  if (category?.type !== ChannelType.GuildCategory) return { ok: false, reason: "Tickets aren't set up in this server." };
  const me = guild.members.me;
  if (!me || !category.permissionsFor(me).has(TICKET_BOT_PERMS)) {
    return { ok: false, reason: "I'm missing permissions to create tickets. Please tell a server admin." };
  }

  const key = `${guild.id}:${member.id}`;
  if (opening.has(key)) return { ok: false, reason: "Your ticket is already being created." };
  opening.add(key);
  try {
    // Tickets whose channel was deleted while the bot was offline are closed here.
    const open = await TicketModel.find({ guildId: guild.id, openerId: member.id, status: "open" }, { channelId: 1, number: 1 }).lean();
    const live = [];
    for (const t of open) {
      if (t.channelId && guild.channels.cache.has(t.channelId)) live.push(t);
      else await TicketModel.updateOne({ _id: t._id }, { $set: { status: "closed", closedAt: new Date() } });
    }
    if (live.length >= cfg.maxOpenPerUser) {
      return { ok: false, reason: `You already have an open ticket: ${live.map((t) => `<#${t.channelId}>`).join(", ")}` };
    }

    const number = await nextSeq(guild.id, "ticket");
    const ticket = await TicketModel.create({ guildId: guild.id, number, openerId: member.id });
    const staffRoles = cfg.staffRoleIds.filter((id) => guild.roles.cache.has(id));
    const overwrites: OverwriteResolvable[] = [
      { id: guild.roles.everyone.id, type: OverwriteType.Role, deny: [PermissionFlagsBits.ViewChannel] },
      { id: member.id, type: OverwriteType.Member, allow: MEMBER_ALLOW },
      ...staffRoles.map((id) => ({ id, type: OverwriteType.Role, allow: [...MEMBER_ALLOW, PermissionFlagsBits.ManageMessages] })),
      { id: me.id, type: OverwriteType.Member, allow: [...MEMBER_ALLOW, PermissionFlagsBits.ManageChannels] },
    ];
    const channel = await guild.channels
      .create({
        name: `ticket-${String(number).padStart(4, "0")}`,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: `Ticket #${number} opened by ${member.user.username} (${member.id})`,
        permissionOverwrites: overwrites,
        reason: `Ticket #${number}`,
      })
      .catch((err: unknown) => {
        container.logger.warn(`Ticket channel creation failed in ${guild.id}:`, err);
        return null;
      });
    if (!channel) {
      await TicketModel.deleteOne({ _id: ticket._id });
      return { ok: false, reason: "I couldn't create the ticket channel. Please tell a server admin." };
    }
    await TicketModel.updateOne({ _id: ticket._id }, { $set: { channelId: channel.id } });

    await channel.send({
      content: [`<@${member.id}>`, ...staffRoles.map((r) => `<@&${r}>`)].join(" "),
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`🎫 Ticket #${number}`)
          .setDescription(truncate(subject, 4000))
          .addFields({ name: "Opened by", value: `<@${member.id}>` })
          .setFooter({ text: "Staff will be with you soon. Press Close when you're done." }),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(TICKET_CLOSE_ID).setLabel("Close ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger),
        ),
      ],
      allowedMentions: { users: [member.id], roles: staffRoles },
    });
    return { ok: true, channelId: channel.id, number };
  } finally {
    opening.delete(key);
  }
}

/** Plain-text transcript of a ticket channel, oldest first (up to 2,000 messages). */
async function transcript(channel: GuildTextBasedChannel): Promise<{ text: string; count: number }> {
  const all = [];
  let before: string | undefined;
  while (all.length < 2000) {
    const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (batch.size === 0) break;
    all.push(...batch.values());
    before = batch.lastKey();
  }
  all.reverse();
  const lines = all.map((m) => {
    const extras =
      [...m.attachments.values()].map((a) => ` [attachment: ${a.url}]`).join("") +
      m.embeds.map((e) => ` [embed: ${e.title ?? ""}]`).join("");
    return `[${m.createdAt.toISOString().replace("T", " ").slice(0, 19)}] ${m.author.username} (${m.author.id}): ${m.content}${extras}`;
  });
  return { text: lines.join("\n"), count: all.length };
}

export type CloseResult = { ok: true; number: number } | { ok: false; reason: string };

/**
 * Close the ticket in `channel`: only its opener or staff may. The status flip is
 * conditional (open -> closed) so two people pressing Close can't both run it. The
 * transcript is posted to the log channel (Discord only; never stored by the bot),
 * then the channel is deleted.
 */
export async function closeTicket(guild: Guild, channel: GuildTextBasedChannel, by: GuildMember): Promise<CloseResult> {
  const cfg = (await getFeatureSettings(guild.id)).tickets;
  const t = await TicketModel.findOne({ guildId: guild.id, channelId: channel.id, status: "open" }).lean();
  if (!t) return { ok: false, reason: "This isn't an open ticket." };
  if (t.openerId !== by.id && !isStaff(by, cfg)) return { ok: false, reason: "Only the ticket's opener or staff can close it." };
  const claimed = await TicketModel.updateOne(
    { _id: t._id, status: "open" },
    { $set: { status: "closed", closedAt: new Date(), closedBy: by.id } },
  );
  if (claimed.modifiedCount !== 1) return { ok: false, reason: "This ticket is already closing." };

  const log = cfg.logChannelId ? guild.channels.cache.get(cfg.logChannelId) : undefined;
  if (log?.isSendable()) {
    const files: AttachmentBuilder[] = [];
    let count: number | null = null;
    if (cfg.transcripts) {
      const tr = await transcript(channel).catch(() => null);
      if (tr) {
        count = tr.count;
        files.push(new AttachmentBuilder(Buffer.from(tr.text, "utf8"), { name: `ticket-${String(t.number).padStart(4, "0")}.txt` }));
      }
    }
    await log
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x95a5a6)
            .setTitle(`🎫 Ticket #${t.number} closed`)
            .addFields(
              { name: "Opened by", value: `<@${t.openerId}>`, inline: true },
              { name: "Closed by", value: `<@${by.id}>`, inline: true },
              { name: "Opened", value: time(t.openedAt, "R"), inline: true },
              ...(count !== null ? [{ name: "Messages", value: String(count), inline: true }] : []),
            )
            .setTimestamp(),
        ],
        files,
        allowedMentions: { parse: [] },
      })
      .catch((err: unknown) => {
        container.logger.warn(`Ticket log failed in ${guild.id}:`, err);
      });
  }

  setTimeout(() => {
    void channel.delete(`Ticket #${t.number} closed by ${by.user.username}`).catch(() => undefined);
  }, 5_000);
  return { ok: true, number: t.number };
}

/** A ticket channel was deleted by hand: mark it closed. */
export async function ticketChannelDeleted(channelId: string): Promise<void> {
  await TicketModel.updateMany({ channelId, status: "open" }, { $set: { status: "closed", closedAt: new Date() } });
}

export async function isTicketChannel(guildId: string, channelId: string): Promise<boolean> {
  return (await TicketModel.exists({ guildId, channelId, status: "open" })) !== null;
}

export async function deleteTicketsForUser(userId: string): Promise<void> {
  await TicketModel.deleteMany({ openerId: userId });
}

export async function deleteTicketsForGuild(guildId: string): Promise<void> {
  await TicketModel.deleteMany({ guildId });
}

/** Open-ticket counts, for /ticket status. */
export async function openTicketCount(guildId: string): Promise<number> {
  return TicketModel.countDocuments({ guildId, status: mongoose.trusted({ $eq: "open" }) });
}
