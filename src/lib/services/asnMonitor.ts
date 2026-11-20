import { container } from "@sapphire/framework";
import { EmbedBuilder, escapeMarkdown, type Client } from "discord.js";
import { NETWORK_ASN } from "../constants.js";
import { networkLinkRow } from "../embeds.js";
import { hasEvents, initialMonitorState, stepMonitor, type MonitorEvents, type MonitorState } from "../features/asn.js";
import { asNames, networkState } from "./asn.js";

/**
 * Watches AS202902 from the outside (RIPE RIS + RPKI via RIPEstat) and posts to
 * ASN_MONITOR_CHANNEL when something changes: a prefix loses visibility or disappears,
 * RPKI stops validating, another AS originates our space (possible hijack), or an
 * upstream appears/disappears. Alerts fire on transitions only, with a matching
 * "recovered" message, so a lasting problem is reported once rather than every tick.
 *
 * State lives in memory: after a restart, any problem that is still ongoing is reported again.
 */
let state: MonitorState = initialMonitorState();

/** For tests. */
export const resetAsnMonitor = () => {
  state = initialMonitorState();
};

export async function buildAlertEmbed(events: MonitorEvents): Promise<EmbedBuilder> {
  const names = await asNames([...events.upstreamsAdded, ...events.upstreamsRemoved]);
  const label = (asn: number) => {
    const name = names.get(asn);
    return name ? `AS${asn} (${escapeMarkdown(name.slice(0, 40))})` : `AS${asn}`;
  };
  const lines = [
    ...events.problems.map((c) => `⚠️ **${c.label}**: ${c.detail}`),
    ...events.recovered.map((c) => `✅ **${c.label}**: ${c.detail}`),
    ...events.upstreamsAdded.map((a) => `➕ New upstream: ${label(a)}`),
    ...events.upstreamsRemoved.map((a) => `➖ Upstream gone: ${label(a)}`),
  ];
  const bad = events.problems.length > 0;
  return new EmbedBuilder()
    .setColor(bad ? 0xe74c3c : 0x2ecc71)
    .setTitle(bad ? `AS${NETWORK_ASN} routing alert` : `AS${NETWORK_ASN} routing update`)
    .setDescription(lines.join("\n").slice(0, 4000))
    .setURL(`https://bgp.tools/as/${NETWORK_ASN}`)
    .setTimestamp(new Date());
}

/** One monitor tick. A failed fetch throws before state changes, so it never causes an alert. */
export async function runAsnMonitor(client: Client<true>, channelId: string): Promise<void> {
  const snapshot = await networkState(NETWORK_ASN);
  const { state: next, events } = stepMonitor(state, snapshot);
  state = next;
  if (!hasEvents(events)) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isSendable()) {
    container.logger.warn(`ASN monitor: channel ${channelId} is missing or not writable`);
    return;
  }
  await channel.send({ embeds: [await buildAlertEmbed(events)], components: [networkLinkRow()], allowedMentions: { parse: [] } });
}
