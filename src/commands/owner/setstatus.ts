import { Command } from "@sapphire/framework";
import type { SlashCommandStringOption } from "discord.js";
import { ephemeral, registerOwnerCommand } from "../../lib/commands.js";
import { brandEmbed, truncate } from "../../lib/embeds.js";
import { STATUS_TYPES, type StatusType } from "../../lib/db/models/index.js";
import {
  DEFAULT_INTERVAL_SEC,
  DEFAULT_ROTATION,
  MAX_INTERVAL_SEC,
  MAX_ROTATION,
  MAX_STATUS_LENGTH,
  MIN_INTERVAL_SEC,
  moveItem,
  PLACEHOLDERS,
  renderStatus,
  unknownPlaceholders,
  usesPlaceholder,
  type StatusEntry,
  type StatusVars,
} from "../../lib/features/presence.js";
import { getPresenceConfig, PresenceConflictError, statusVars, updatePresenceConfig } from "../../lib/services/presence.js";

const PLACEHOLDER_HELP = Object.keys(PLACEHOLDERS)
  .map((k) => `{${k}}`)
  .join(" ");
const TYPE_LABEL: Record<StatusType, string> = {
  playing: "Playing",
  watching: "Watching",
  listening: "Listening to",
  competing: "Competing in",
  custom: "", // custom statuses are shown with no prefix
};

/** Raw status text as inline code. Backticks can't be escaped inside a code span, so they're swapped for a look-alike. */
const code = (text: string) => `\`${text.replaceAll("`", "ˋ")}\``;

const textOption = (o: SlashCommandStringOption) =>
  o.setName("text").setDescription(`Status text. Placeholders: ${PLACEHOLDER_HELP}`.slice(0, 100)).setRequired(true).setMaxLength(MAX_STATUS_LENGTH);
const typeOption = (o: SlashCommandStringOption) =>
  o
    .setName("type")
    .setDescription("Activity type (default: playing)")
    .addChoices(...STATUS_TYPES.map((t) => ({ name: t === "custom" ? "custom (no prefix)" : t, value: t })));

class UserFacingError extends Error {}

/** Owner-only: view and edit the bot's rotating status (stored in the database, survives restarts). */
export class SetStatusCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "setstatus",
      description: "View and edit the bot's rotating status",
      preconditions: ["OwnerOnly"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerOwnerCommand(this, registry, (b) =>
      b
        .addSubcommand((s) => s.setName("list").setDescription("Show the rotation, the interval and a live preview"))
        .addSubcommand((s) =>
          s
            .setName("add")
            .setDescription("Add a status to the rotation")
            .addStringOption(textOption)
            .addStringOption(typeOption)
            .addIntegerOption((o) => o.setName("position").setDescription("Insert at # (default: end)").setMinValue(1).setMaxValue(MAX_ROTATION)),
        )
        .addSubcommand((s) =>
          s
            .setName("edit")
            .setDescription("Change a status in the rotation")
            .addIntegerOption((o) => o.setName("number").setDescription("# from /setstatus list").setRequired(true).setMinValue(1).setMaxValue(MAX_ROTATION))
            .addStringOption(textOption)
            .addStringOption(typeOption),
        )
        .addSubcommand((s) =>
          s
            .setName("remove")
            .setDescription("Remove a status from the rotation")
            .addIntegerOption((o) => o.setName("number").setDescription("# from /setstatus list").setRequired(true).setMinValue(1).setMaxValue(MAX_ROTATION)),
        )
        .addSubcommand((s) =>
          s
            .setName("move")
            .setDescription("Reorder the rotation")
            .addIntegerOption((o) => o.setName("from").setDescription("Current #").setRequired(true).setMinValue(1).setMaxValue(MAX_ROTATION))
            .addIntegerOption((o) => o.setName("to").setDescription("New #").setRequired(true).setMinValue(1).setMaxValue(MAX_ROTATION)),
        )
        .addSubcommand((s) =>
          s
            .setName("interval")
            .setDescription("How often the status changes")
            .addIntegerOption((o) => o.setName("seconds").setDescription(`${MIN_INTERVAL_SEC} – ${MAX_INTERVAL_SEC} (default ${DEFAULT_INTERVAL_SEC})`)
                .setRequired(true)
                .setMinValue(MIN_INTERVAL_SEC)
                .setMaxValue(MAX_INTERVAL_SEC)),
        )
        .addSubcommand((s) =>
          s
            .setName("pin")
            .setDescription("Show one status permanently (pauses the rotation)")
            .addStringOption(textOption)
            .addStringOption(typeOption),
        )
        .addSubcommand((s) => s.setName("unpin").setDescription("Resume the rotation"))
        .addSubcommand((s) =>
          s
            .setName("preview")
            .setDescription("See how a status would look, without saving it")
            .addStringOption(textOption)
            .addStringOption(typeOption),
        )
        .addSubcommand((s) => s.setName("reset").setDescription("Restore the default rotation and interval, and unpin")),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;
    const o = interaction.options;
    const sub = o.getSubcommand();
    // Defer first: the DB reads and compare-and-set retries below can outlast Discord's 3s reply window.
    await interaction.deferReply({ flags: ephemeral });
    const show = (e: StatusEntry, vars: StatusVars) => `${TYPE_LABEL[e.type] ? `${TYPE_LABEL[e.type]} ` : ""}**${renderStatus(e.text, vars)}**`;
    /** Render one entry, reading the message count only if it's used. */
    const showNow = async (e: StatusEntry) => show(e, await statusVars(interaction.client, { messages: usesPlaceholder(e.text, "messages") }));
    const reply = (content: string) => interaction.editReply({ content: truncate(content, 2000), allowedMentions: { parse: [] } });

    const entryFromOptions = (): StatusEntry => {
      const text = o.getString("text", true).trim();
      const unknown = unknownPlaceholders(text);
      if (unknown.length) throw new UserFacingError(`Unknown placeholder(s): ${unknown.map((u) => `\`{${u}}\``).join(", ")}. Available: ${PLACEHOLDER_HELP}`);
      if (!text) throw new UserFacingError("The status text can't be empty.");
      return { text, type: (o.getString("type") as StatusType | null) ?? "playing" };
    };
    const at = (list: readonly StatusEntry[], n: number) => {
      if (n < 1 || n > list.length) throw new UserFacingError(`There's no #${n}; the rotation has ${list.length} status(es).`);
      return n - 1;
    };

    try {
      switch (sub) {
        case "list": {
          const cfg = await getPresenceConfig();
          const vars = await statusVars(interaction.client); // all values: the placeholder list shows each one
          const lines = cfg.rotation.map((e, i) => `**${i + 1}.** ${code(e.text)} (${e.type})\n  → ${show(e, vars)}`);
          await interaction.editReply({
            embeds: [
              brandEmbed(interaction.client)
                .setTitle("Status rotation")
                .setDescription(truncate(lines.join("\n") || "*(empty: nothing is shown)*", 4000))
                .addFields(
                  { name: "Changes every", value: `${cfg.intervalSec}s`, inline: true },
                  { name: "Source", value: cfg.isDefault ? "built-in default" : "custom", inline: true },
                  { name: "Pinned", value: cfg.pinned ? truncate(`${code(cfg.pinned.text)} → ${show(cfg.pinned, vars)} (rotation paused)`, 1024) : "no" },
                  { name: "Placeholders", value: Object.entries(PLACEHOLDERS).map(([k, p]) => `\`{${k}}\` ${p.describe} (now: ${p.render(vars)})`).join("\n") },
                ),
            ],
          });
          return;
        }
        case "preview": {
          const e = entryFromOptions();
          await reply(`Preview: ${await showNow(e)}`);
          return;
        }
        case "add": {
          const e = entryFromOptions();
          const pos = o.getInteger("position");
          let idx = 0;
          await updatePresenceConfig((cur) => {
            if (cur.rotation.length >= MAX_ROTATION) throw new UserFacingError(`The rotation can hold at most ${MAX_ROTATION} statuses.`);
            const list = [...cur.rotation];
            idx = pos ? Math.min(pos - 1, list.length) : list.length; // past the end appends
            list.splice(idx, 0, e);
            return { rotation: list };
          });
          const clamped = pos !== null && pos - 1 !== idx ? ` (there was no #${pos})` : "";
          await reply(`✅ Added as #${idx + 1}${clamped}: ${await showNow(e)}`);
          return;
        }
        case "edit": {
          const e = entryFromOptions();
          const n = o.getInteger("number", true);
          await updatePresenceConfig((cur) => {
            const list = [...cur.rotation];
            list[at(list, n)] = e;
            return { rotation: list };
          });
          await reply(`✅ #${n} is now: ${await showNow(e)}`);
          return;
        }
        case "remove": {
          const n = o.getInteger("number", true);
          let removed: StatusEntry | undefined;
          await updatePresenceConfig((cur) => {
            const list = [...cur.rotation];
            removed = list.splice(at(list, n), 1)[0];
            if (list.length === 0) throw new UserFacingError("That's the last status. Add another first, or use `/setstatus pin`.");
            return { rotation: list };
          });
          await reply(`✅ Removed #${n}${removed ? `: ${code(removed.text)}` : ""}.`);
          return;
        }
        case "move": {
          const from = o.getInteger("from", true);
          const to = o.getInteger("to", true);
          let dest = to;
          await updatePresenceConfig((cur) => {
            const i = at(cur.rotation, from);
            dest = Math.min(to, cur.rotation.length); // moveItem clamps the same way
            return { rotation: moveItem(cur.rotation, i, dest - 1) };
          });
          await reply(`✅ Moved #${from} to #${dest}${dest !== to ? ` (the end; there's no #${to})` : ""}.`);
          return;
        }
        case "interval": {
          const seconds = o.getInteger("seconds", true);
          await updatePresenceConfig(() => ({ intervalSec: seconds }));
          await reply(`✅ The status now changes every **${seconds}s**.`);
          return;
        }
        case "pin": {
          const e = entryFromOptions();
          await updatePresenceConfig(() => ({ pinned: e }));
          await reply(`📌 Pinned: ${await showNow(e)}. The rotation is paused until \`/setstatus unpin\`.`);
          return;
        }
        case "unpin":
          await updatePresenceConfig((cur) => (cur.pinned ? { pinned: null } : null));
          await reply("✅ Rotation resumed.");
          return;
        case "reset":
          await updatePresenceConfig(() => ({ rotation: null, intervalSec: DEFAULT_INTERVAL_SEC, pinned: null }));
          await reply(`✅ Restored the default rotation (${DEFAULT_ROTATION.length} statuses, every ${DEFAULT_INTERVAL_SEC}s).`);
          return;
      }
    } catch (err) {
      if (err instanceof UserFacingError || err instanceof PresenceConflictError) {
        await reply(`❌ ${err.message}`);
        return;
      }
      throw err;
    }
  }
}
