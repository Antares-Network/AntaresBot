import { Command } from "@sapphire/framework";
import { ChannelType, OverwriteType, PermissionFlagsBits } from "discord.js";
import { ephemeral, registerGuildCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { ensureServer } from "../../lib/services/servers.js";
import { getFeatureSettings, SettingsValidationError, updateSettings } from "../../lib/services/settings.js";
import { closeTicket, isStaff, isTicketChannel, openTicketCount, panelRow, TICKET_BOT_PERMS } from "../../lib/services/tickets.js";

const TEXT = [ChannelType.GuildText, ChannelType.GuildAnnouncement] as const;

export class TicketCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: "ticket", description: "Support tickets" });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b
        .addSubcommand((s) =>
          s
            .setName("setup")
            .setDescription("Set up tickets (needs Manage Server)")
            .addChannelOption((o) =>
              o
                .setName("category")
                .setDescription("Category for ticket channels")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildCategory),
            )
            .addRoleOption((o) => o.setName("staff_role").setDescription("Role that handles tickets").setRequired(true))
            .addChannelOption((o) =>
              o
                .setName("log_channel")
                .setDescription("Where closed tickets are logged")
                .addChannelTypes(...TEXT),
            )
            .addBooleanOption((o) => o.setName("transcripts").setDescription("Attach a transcript to the log (default on)"))
            .addIntegerOption((o) =>
              o.setName("max_open").setDescription("Open tickets allowed per member (default 1)").setMinValue(1).setMaxValue(5),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("staff")
            .setDescription("Add or remove a staff role (needs Manage Server)")
            .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true)),
        )
        .addSubcommand((s) =>
          s
            .setName("panel")
            .setDescription("Post the 'Open a ticket' button (needs Manage Server)")
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("Where (default: here)")
                .addChannelTypes(...TEXT),
            )
            .addStringOption((o) => o.setName("title").setDescription("Panel title").setMaxLength(100))
            .addStringOption((o) => o.setName("description").setDescription("Panel text").setMaxLength(1000)),
        )
        .addSubcommand((s) => s.setName("close").setDescription("Close this ticket"))
        .addSubcommand((s) =>
          s
            .setName("add")
            .setDescription("Add someone to this ticket (staff)")
            .addUserOption((o) => o.setName("member").setDescription("Who").setRequired(true)),
        )
        .addSubcommand((s) =>
          s
            .setName("remove")
            .setDescription("Remove someone from this ticket (staff)")
            .addUserOption((o) => o.setName("member").setDescription("Who").setRequired(true)),
        )
        .addSubcommand((s) => s.setName("disable").setDescription("Turn tickets off (needs Manage Server)")),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const sub = interaction.options.getSubcommand();
    const o = interaction.options;
    const g = interaction.guildId;
    const reply = (content: string) => interaction.reply({ content, flags: ephemeral, allowedMentions: { parse: [] } });
    const cfg = (await getFeatureSettings(g)).tickets;

    // ---- in-ticket actions
    if (sub === "close" || sub === "add" || sub === "remove") {
      const channel = interaction.channel;
      if (!channel || !(await isTicketChannel(g, channel.id))) {
        await reply("Use this inside an open ticket channel.");
        return;
      }
      if (sub === "close") {
        const r = await closeTicket(interaction.guild, channel, interaction.member);
        {
          await interaction.reply(
            r.ok
              ? { content: `🔒 Ticket #${r.number} closed. This channel will be deleted in 5 seconds.` }
              : { content: r.reason, flags: ephemeral },
          );
          return;
        }
      }
      if (!isStaff(interaction.member, cfg)) {
        await reply("❌ Only ticket staff can do that.");
        return;
      }
      if (channel.type !== ChannelType.GuildText) {
        await reply("❌ That isn't a ticket channel.");
        return;
      }
      const user = o.getUser("member", true);
      if (sub === "add") {
        await channel.permissionOverwrites.edit(
          user.id,
          { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true, EmbedLinks: true },
          { type: OverwriteType.Member, reason: `Added to ticket by ${interaction.user.username}` },
        );
        {
          await interaction.reply({ content: `✅ Added <@${user.id}> to this ticket.`, allowedMentions: { users: [user.id] } });
          return;
        }
      }
      await channel.permissionOverwrites.delete(user.id, `Removed from ticket by ${interaction.user.username}`);
      {
        await reply(`✅ Removed <@${user.id}> from this ticket.`);
        return;
      }
    }

    // ---- admin actions
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      await reply("❌ You need **Manage Server** for that.");
      return;
    }
    await ensureServer(interaction.guild);
    try {
      switch (sub) {
        case "setup": {
          const category = o.getChannel("category", true, [ChannelType.GuildCategory]);
          const me = interaction.guild.members.me;
          if (!me || !category.permissionsFor(me).has(TICKET_BOT_PERMS)) {
            {
              await reply(
                `❌ In **${category.name}** I need View Channel, Manage Channels, Manage Roles (for channel permissions) and Send Messages.`,
              );
              return;
            }
          }
          const role = o.getRole("staff_role", true);
          if (role.id === interaction.guild.id) {
            await reply("❌ @everyone can't be the staff role.");
            return;
          }
          const log = o.getChannel("log_channel", false, [...TEXT]);
          const transcripts = o.getBoolean("transcripts");
          const maxOpen = o.getInteger("max_open");
          const s = await updateSettings(g, "tickets", {
            categoryId: category.id,
            staffRoleIds: [role.id],
            ...(log ? { logChannelId: log.id } : {}),
            ...(transcripts !== null ? { transcripts } : {}),
            ...(maxOpen ? { maxOpenPerUser: maxOpen } : {}),
          });
          {
            await reply(
              `✅ Tickets will be created in **${category.name}** for <@&${role.id}>. ` +
                `Log: ${s?.logChannelId ? `<#${s.logChannelId}>${s.transcripts ? " (with transcripts)" : ""}` : "none"}. ` +
                "Now post the button with `/ticket panel`.",
            );
            return;
          }
        }
        case "staff": {
          const role = o.getRole("role", true);
          if (role.id === interaction.guild.id) {
            await reply("❌ @everyone can't be a staff role.");
            return;
          }
          const result = { added: false };
          await updateSettings(g, "tickets", (c) => {
            result.added = !c.staffRoleIds.includes(role.id);
            return { staffRoleIds: result.added ? [...c.staffRoleIds, role.id] : c.staffRoleIds.filter((r) => r !== role.id) };
          });
          {
            await reply(`✅ <@&${role.id}> ${result.added ? "now handles" : "no longer handles"} new tickets.`);
            return;
          }
        }
        case "disable":
          await updateSettings(g, "tickets", { categoryId: null });
          {
            await reply(`✅ Tickets are off. ${await openTicketCount(g)} open ticket channel(s) were left as they are.`);
            return;
          }
        case "panel": {
          if (!cfg.categoryId) {
            await reply("Set tickets up first with `/ticket setup`.");
            return;
          }
          const target = o.getChannel("channel", false, [...TEXT]) ?? interaction.channel;
          if (!target?.isSendable() || !("permissionsFor" in target)) {
            await reply("I can't post there.");
            return;
          }
          if (!target.permissionsFor(interaction.member).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
            {
              await reply("You don't have permission to send messages in that channel.");
              return;
            }
          }
          await target.send({
            embeds: [
              brandEmbed(interaction.client)
                .setTitle(o.getString("title") ?? "🎫 Need help?")
                .setDescription(o.getString("description") ?? "Press the button below to open a private ticket with the staff team."),
            ],
            components: [panelRow()],
            allowedMentions: { parse: [] },
          });
          {
            await reply(`✅ Ticket panel posted in <#${target.id}>.`);
            return;
          }
        }
      }
    } catch (err) {
      if (err instanceof SettingsValidationError) {
        await reply(`❌ ${err.issues.join("\n")}`);
        return;
      }
      throw err;
    }
  }
}
