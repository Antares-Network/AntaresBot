import type { RepliableInteraction } from "discord.js";
import { ephemeral } from "./commands.js";

export const GENERIC_ERROR = "Something went wrong running that command. Please try again later.";

/**
 * Show `content` to the invoking user only, whatever state the interaction is in.
 * A deferred reply may be public (e.g. the image commands), and editing it would show the
 * error to the whole channel, so we delete the "thinking…" placeholder and follow up
 * ephemerally instead. (The first follow-up to an unresolved deferral would otherwise
 * replace it and inherit its public visibility.)
 */
export async function safeEphemeral(interaction: RepliableInteraction, content: string): Promise<void> {
  try {
    if (interaction.deferred && !interaction.replied) {
      await interaction.deleteReply().catch(() => undefined);
      await interaction.followUp({ content, flags: ephemeral });
    } else if (interaction.replied) {
      await interaction.followUp({ content, flags: ephemeral });
    } else {
      await interaction.reply({ content, flags: ephemeral });
    }
  } catch {
    // Interaction expired or was deleted; nothing more we can do.
  }
}
