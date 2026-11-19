import { createHmac } from "node:crypto";

/**
 * Pseudonymous confessor ID: HMAC-SHA256(secret, guildId:userId).
 *  - Stable per server, so moderators can block "the author of confession #12" from
 *    confessing again without learning who they are.
 *  - Different per server, so the same person can't be linked across servers.
 *  - Irreversible without the secret, which lives only in the bot's environment.
 */
export function confessorHash(secret: string, guildId: string, userId: string): string {
  return createHmac("sha256", secret).update(`${guildId}:${userId}`).digest("hex");
}
