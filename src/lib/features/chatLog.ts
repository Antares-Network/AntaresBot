/** Development chat logging (CHAT_LOG=true): one console line per message. Pure, unit-tested. */

export interface ChatLogEntry {
  guild: string;
  channel: string;
  author: string;
  authorId: string;
  bot: boolean;
  content: string;
  attachments: number;
}

/**
 * Make user-controlled text safe for one log line: line breaks become a visible marker (so a
 * message can't forge extra log lines) and other control characters, including the ESC that
 * starts terminal escape sequences, are removed.
 */
export function oneLine(text: string): string {
  // \p{Zl}/\p{Zp}: Unicode line/paragraph separators, which some terminals also break on.
  return text.replace(/\r\n|[\r\n\p{Zl}\p{Zp}]/gu, " ⏎ ").replace(/\p{Cc}/gu, "");
}

export function formatChatLine(e: ChatLogEntry): string {
  const text = e.content ? oneLine(e.content) : "(no text)";
  const files = e.attachments > 0 ? ` [+${e.attachments} attachment(s)]` : "";
  return `[chat] ${oneLine(e.guild)} #${oneLine(e.channel)} | ${oneLine(e.author)}${e.bot ? " [bot]" : ""} (${e.authorId}): ${text}${files}`;
}
