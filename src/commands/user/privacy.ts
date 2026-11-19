import { Command } from "@sapphire/framework";
import { ephemeral, registerAnywhereCommand } from "../../lib/commands.js";
import { brandEmbed } from "../../lib/embeds.js";
import { GITHUB_URL } from "../../lib/constants.js";

export const PRIVACY_POLICY = [
  "**Server data (when the bot is in a server)**",
  "• Server name, ID, icon, owner ID, member count and join date",
  "• The total *number* of messages sent (a count only)",
  "• The server's bot settings, counting state, and admin-created auto-replies",
  "• Starboard: starred message IDs and star counts",
  "• Confessions: a number and a one-way keyed hash that lets mods block a confessor without anyone knowing who they are",
  "• Moderation cases (warnings etc.), suggestions and their voters, support-ticket records (not their text)",
  "• An audit log of admin setting changes, kept 90 days",
  "",
  "**Per-user data**",
  "• Once you run a command or count: your ID, username, first/last use, per-command usage, counting score and preferences",
  "• In servers with **levels** turned on: your XP and level there, earned by chatting",
  "• Your birthday (month/day only) in servers where you set it",
  "• Your reminders, until delivered or cancelled",
  "",
  "**Message content** is read in memory only (counting, games, auto-mod, auto-replies, link previews, XP) and never stored or logged. If a server enables its mod log, edited/deleted messages appear in that server's own moderator channel.",
  "",
  "All data is stored on secured servers. Maximum efforts are taken to keep it protected, but absolute security cannot be guaranteed. By being in a server that uses Antares Bot, or by adding it to your server, you consent to this policy, which may change at any time.",
  "",
  "**Run `/remove` to immediately delete everything stored about you** (moderation cases are kept as the server's record). Server data is deleted when the bot is removed from the server.",
  `Full policy: ${GITHUB_URL}/blob/main/PRIVACY.md`,
].join("\n");

export class PrivacyCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: "Sends the privacy policy for the bot in a dm" });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerAnywhereCommand(this, registry);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const embed = brandEmbed(interaction.client).setTitle("Antares Bot Privacy Policy").setDescription(PRIVACY_POLICY);
    try {
      await interaction.user.send({ embeds: [embed] });
      await interaction.reply({ content: "You have been sent a DM with the privacy policy.", flags: ephemeral });
    } catch {
      // DMs closed: show it here instead.
      await interaction.reply({ embeds: [embed], flags: ephemeral });
    }
  }
}
