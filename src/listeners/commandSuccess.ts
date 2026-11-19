import { Events, Listener, type ChatInputCommandSuccessPayload } from "@sapphire/framework";
import type { CommandInteractionOption } from "discord.js";
import { truncate } from "../lib/embeds.js";
import { report } from "../lib/reporting.js";
import { recordAudit } from "../lib/services/audit.js";
import { recordCommand } from "../lib/services/users.js";

/** Commands whose every use is written to the audit trail. */
const AUDITED_CATEGORIES = new Set(["owner", "admin"]);
const QUIET = new Set(["adminhelp", "ar", "me", "whois"]); // read-only, not worth auditing
/**
 * Never recorded anywhere: /remove (would recreate the data it just deleted) and /confess
 * (even a usage count would reveal *that* someone confesses).
 */
const UNTRACKED = new Set(["remove", "confess"]);

function describeOptions(options: readonly CommandInteractionOption[]): string {
  return options
    .flatMap((o) =>
      o.options
        ? [o.name, describeOptions(o.options)]
        : [`${o.name}:${truncate(String(o.value ?? o.user?.id ?? o.channel?.id ?? o.role?.id ?? ""), 200)}`],
    )
    .join(" ");
}

export class ChatInputCommandSuccessListener extends Listener<typeof Events.ChatInputCommandSuccess> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.ChatInputCommandSuccess });
  }

  public override async run({ interaction, command }: ChatInputCommandSuccessPayload) {
    if (UNTRACKED.has(command.name)) return;
    recordCommand(interaction.user, command.name);

    // Audit trail for privileged actions: who did what, where.
    if (AUDITED_CATEGORIES.has(command.category ?? "") && !QUIET.has(command.name)) {
      const details = describeOptions(interaction.options.data);
      const where = interaction.guild ? `${interaction.guild.name} (${interaction.guildId})` : "DM";
      const line = `🛡️ AUDIT /${command.name} ${details}`.trim() + `\nby ${interaction.user.tag} (${interaction.user.id}) in ${where}`;
      // Every line break: options, tags and server names are user-supplied and can contain them.
      this.container.logger.info(line.replace(/[\r\n]+/g, " "));
      await recordAudit({
        guildId: interaction.guildId,
        actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        source: "command",
        action: `/${command.name}`,
        details,
      });
      // Server-level admin commands go to that server's own mod log; owner commands to the bot owner.
      if (command.category === "owner") await report(interaction.client, truncate(line, 1900));
    }
  }
}
