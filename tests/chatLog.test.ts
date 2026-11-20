import { describe, expect, it } from "vitest";
import { formatChatLine, oneLine } from "../src/lib/features/chatLog.js";

const entry = { guild: "Antares", channel: "general", author: "nate", authorId: "603629606154666024", bot: false, content: "hi", attachments: 0 };

describe("chat log lines", () => {
  it("formats a message", () => {
    expect(formatChatLine(entry)).toBe("[chat] Antares #general | nate (603629606154666024): hi");
    expect(formatChatLine({ ...entry, bot: true, content: "", attachments: 2 })).toBe(
      "[chat] Antares #general | nate [bot] (603629606154666024): (no text) [+2 attachment(s)]",
    );
  });

  it("keeps each message on one line and strips terminal escapes", () => {
    expect(oneLine(`a\nb\r\nc${String.fromCharCode(0x2028)}d`)).toBe("a ⏎ b ⏎ c ⏎ d");
    expect(oneLine("\u001b[31mred\u001b[0m\u0007")).toBe("[31mred[0m");
    const line = formatChatLine({ ...entry, guild: "evil\nserver", author: "x\r\n[chat] fake", content: "one\ntwo" });
    expect(line).not.toMatch(/[\r\n]/);
  });
});
