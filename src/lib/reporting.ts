import { container } from "@sapphire/framework";
import type { Client, MessageCreateOptions } from "discord.js";

/** Send an operational notice to the owner(s) by DM and to REPORTING_CHANNEL if configured. */
export async function report(client: Client, payload: string | MessageCreateOptions): Promise<void> {
  const msg: MessageCreateOptions =
    typeof payload === "string" ? { content: payload, allowedMentions: { parse: [] } } : { allowedMentions: { parse: [] }, ...payload };
  const { BOT_OWNER_IDS, REPORTING_CHANNEL } = container.config;

  const jobs: Promise<unknown>[] = BOT_OWNER_IDS.map((id) => client.users.send(id, msg));
  if (REPORTING_CHANNEL) {
    jobs.push(
      (async () => {
        const ch = await client.channels.fetch(REPORTING_CHANNEL);
        if (ch?.isSendable()) await ch.send(msg);
      })(),
    );
  }
  for (const r of await Promise.allSettled(jobs)) {
    if (r.status === "rejected") container.logger.warn("Report delivery failed:", r.reason);
  }
}
