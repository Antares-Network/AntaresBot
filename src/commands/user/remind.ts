import { Command } from "@sapphire/framework";
import { ApplicationIntegrationType, InteractionContextType, time } from "discord.js";
import { ephemeral } from "../../lib/commands.js";
import { truncate } from "../../lib/embeds.js";
import { parseDuration } from "../../lib/features/duration.js";
import { cancelReminder, createReminder, listReminders, MAX_REMINDERS_PER_USER, ReminderLimitError } from "../../lib/services/reminders.js";

export class RemindCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Set a reminder" });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      b
        .setName(this.name)
        .setDescription(this.description)
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
        .addSubcommand((s) =>
          s
            .setName("me")
            .setDescription("Remind me after a while")
            .addStringOption((o) => o.setName("in").setDescription("e.g. 10m, 2h30m, 1 day, 1w").setRequired(true).setMaxLength(40))
            .addStringOption((o) => o.setName("about").setDescription("What to remind you about").setRequired(true).setMaxLength(500))
            .addBooleanOption((o) => o.setName("dm").setDescription("Remind me by DM instead of in this channel")),
        )
        .addSubcommand((s) => s.setName("list").setDescription("Your pending reminders"))
        .addSubcommand((s) =>
          s
            .setName("cancel")
            .setDescription("Cancel a reminder")
            .addStringOption((o) => o.setName("id").setDescription("ID from /remind list").setRequired(true).setMaxLength(24)),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === "list") {
      const list = await listReminders(userId);
      await interaction.reply({
        content: list.length
          ? list.map((r) => `\`${r.id}\` ${time(r.dueAt, "R")}: ${truncate(r.text, 80)}`).join("\n")
          : "You have no pending reminders.",
        flags: ephemeral,
        allowedMentions: { parse: [] },
      });
      return;
    }
    if (sub === "cancel") {
      const ok = await cancelReminder(userId, interaction.options.getString("id", true).trim());
      await interaction.reply({ content: ok ? "✅ Reminder cancelled." : "No reminder of yours with that ID.", flags: ephemeral });
      return;
    }

    const ms = parseDuration(interaction.options.getString("in", true));
    if (ms === null) {
      await interaction.reply({ content: "I couldn't read that time. Try `10m`, `2h30m`, `1 day` or `1w` (10 seconds to 1 year).", flags: ephemeral });
      return;
    }
    const inGuildChannel = interaction.inGuild() && !interaction.options.getBoolean("dm");
    try {
      const r = await createReminder({
        userId,
        guildId: interaction.guildId,
        channelId: inGuildChannel ? interaction.channelId : null,
        text: interaction.options.getString("about", true),
        dueAt: new Date(Date.now() + ms),
      });
      await interaction.reply({
        content: `✅ I'll remind you ${time(r.dueAt, "R")} ${inGuildChannel ? "in this channel" : "by DM"}. (ID \`${r.id}\`)`,
        flags: ephemeral,
      });
    } catch (err) {
      if (err instanceof ReminderLimitError) {
        await interaction.reply({ content: `You already have ${MAX_REMINDERS_PER_USER} pending reminders.`, flags: ephemeral });
        return;
      }
      throw err;
    }
  }
}
