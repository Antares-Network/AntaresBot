import { EmbedBuilder, type Client } from "discord.js";
import { BRAND_COLOR, ICON_URL, SNIPS_URL, VERSION } from "./constants.js";

/** Standard Antares embed: brand color + "Delivered in" footer used across the bot. */
export function brandEmbed(client: Client): EmbedBuilder {
  return new EmbedBuilder().setColor(BRAND_COLOR).setFooter({
    text: `Delivered in: ${Math.max(client.ws.ping, 0)}ms | Antares Bot | ${VERSION}`,
    iconURL: ICON_URL,
  });
}

/** The /r and /ar "snips" link embed. */
export function snipsEmbed(): EmbedBuilder {
  return new EmbedBuilder().setColor(BRAND_COLOR).setDescription(`[r](${SNIPS_URL})`);
}

/** Clamp a string to Discord's limits, adding an ellipsis when truncated. */
export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}
