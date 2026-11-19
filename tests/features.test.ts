import { describe, expect, it } from "vitest";
import { achievementsFor } from "../src/lib/features/achievements.js";
import { detectViolation, DuplicateTracker, hasInvite, isShouting } from "../src/lib/features/automod.js";
import { findReply, normaliseTrigger, type AutoReplyRule } from "../src/lib/features/autoreply.js";
import { confessorHash } from "../src/lib/features/confessionHash.js";
import { parseDuration } from "../src/lib/features/duration.js";
import { earnsXp, levelFromXp, totalXpForLevel, xpForNext } from "../src/lib/features/levels.js";
import { evaluateExpression } from "../src/lib/features/mathExpr.js";
import { checkChainWord, scramble, SCRAMBLE_WORDS } from "../src/lib/features/words.js";
import { DEFAULT_SETTINGS, parseSettings, renderTemplate } from "../src/lib/services/settings.js";

describe("evaluateExpression", () => {
  it.each([
    ["42", 42],
    ["12*2", 24],
    ["12 x 2", 24],
    ["(3+4)*2", 14],
    ["2^10", 1024],
    ["2^3^2", 512], // right-associative
    ["100/4", 25],
    ["-5+10", 5],
    ["sqrt(144)", 12],
    ["17 % 5", 2],
    ["10 ÷ 2", 5],
  ])("%s = %d", (src, value) => {
    expect(evaluateExpression(src)).toBe(value);
  });

  it.each([
    "",
    "hello",
    "1+",
    "(1+2",
    "1/0",
    "2^99999",
    "9".repeat(20),
    "process.exit()",
    "constructor",
    "1;2",
    "Math.PI",
    "1".repeat(70),
    "(".repeat(40) + "1" + ")".repeat(40),
    "sqrt(-4)",
  ])("rejects %j", (src) => {
    expect(evaluateExpression(src)).toBeNull();
  });
});

describe("parseDuration", () => {
  it.each([
    ["10m", 600_000],
    ["2h30m", 9_000_000],
    ["1 day 4 hours", 100_800_000],
    ["1w", 604_800_000],
    ["90s", 90_000],
  ])("%s", (src, ms) => {
    expect(parseDuration(src)).toBe(ms);
  });
  it.each(["", "5s", "2 years", "10 parsecs", "abc", "10m banana", "53w"])("rejects %j", (src) => {
    expect(parseDuration(src)).toBeNull();
  });
});

describe("levels", () => {
  it("uses the 5l²+50l+100 curve", () => {
    expect(xpForNext(0)).toBe(100);
    expect(xpForNext(1)).toBe(155);
    expect(totalXpForLevel(2)).toBe(255);
  });
  it("derives level from xp", () => {
    expect(levelFromXp(0)).toEqual({ level: 0, into: 0, needed: 100 });
    expect(levelFromXp(254)).toMatchObject({ level: 1, into: 154 });
    expect(levelFromXp(255)).toMatchObject({ level: 2, into: 0 });
  });
  it("ignores tiny messages for xp", () => {
    expect(earnsXp("a")).toBe(false);
    expect(earnsXp("hey there")).toBe(true);
  });
});

describe("automod", () => {
  it.each(["discord.gg/abc", "https://discord.com/invite/xyz", "join dsc.gg/foo", "discord.g​g/abc"])(
    "detects invite %j",
    (s) => {
      expect(hasInvite(s)).toBe(true);
    },
  );
  it("ignores normal links", () => {
    expect(hasInvite("https://discord.com/developers")).toBe(false);
  });
  it("detects shouting only on longer text", () => {
    expect(isShouting("THIS IS VERY LOUD TEXT")).toBe(true);
    expect(isShouting("OK LOL")).toBe(false);
    expect(isShouting("This is normal text here")).toBe(false);
  });
  it("flags the third identical message in the window", () => {
    const t = new DuplicateTracker(30_000, 3);
    expect(t.check("u", "buy cheap stuff", 0)).toBe(false);
    expect(t.check("u", "buy cheap stuff", 1000)).toBe(false);
    expect(t.check("u", "BUY CHEAP STUFF", 2000)).toBe(true);
    expect(t.check("u", "buy cheap stuff", 60_000)).toBe(false); // window expired
  });
  it("respects disabled checks", () => {
    const off = { invites: false, massMentions: 0, caps: false, isRepeat: false };
    expect(detectViolation("discord.gg/x", 99, off)).toBeNull();
    expect(detectViolation("hi", 6, { ...off, massMentions: 6 })).toBeNull(); // at the limit is allowed
    expect(detectViolation("hi", 7, { ...off, massMentions: 6 })).toBe("mass-mentions");
  });
});

describe("autoreply", () => {
  const rules: AutoReplyRule[] = [
    { trigger: "ip", match: "word", response: "play.example.com" },
    { trigger: "hello bot", match: "exact", response: "hi!" },
    { trigger: "pizza", match: "contains", response: "🍕" },
  ];
  it("matches whole words only for word mode", () => {
    expect(findReply("what's the IP?", rules)?.response).toBe("play.example.com");
    expect(findReply("nice ship", rules)).toBeNull();
  });
  it("matches exact and contains", () => {
    expect(findReply("  Hello   Bot ", rules)?.response).toBe("hi!");
    expect(findReply("pizzatime", rules)?.response).toBe("🍕");
  });
  it("normalises triggers", () => {
    expect(normaliseTrigger("  Hello   World ")).toBe("hello world");
  });
  it("treats regex metacharacters literally", () => {
    expect(findReply("a.*b", [{ trigger: "a.*b", match: "exact", response: "ok" }])?.response).toBe("ok");
    expect(findReply("axxb", [{ trigger: "a.*b", match: "contains", response: "ok" }])).toBeNull();
  });
});

describe("words", () => {
  it("scrambles without changing letters", () => {
    for (const w of SCRAMBLE_WORDS.slice(0, 20)) {
      const s = scramble(w);
      expect(Array.from(s).sort().join("")).toBe(Array.from(w).sort().join(""));
      expect(s).not.toBe(w);
    }
  });
  it("enforces word-chain rules", () => {
    const state = { lastWord: "apple", lastPlayer: "1", used: new Set(["apple"]) };
    expect(checkChainWord("elephant", state, "2")).toEqual({ ok: true });
    expect(checkChainWord("tiger", state, "2")).toEqual({ ok: false, reason: "wrong-letter" });
    expect(checkChainWord("elephant", state, "1")).toEqual({ ok: false, reason: "same-player" });
    expect(checkChainWord("eqzzxq", state, "2")).toEqual({ ok: false, reason: "not-a-word" });
    expect(checkChainWord("ex", state, "2")).toEqual({ ok: false, reason: "too-short" });
  });
});

describe("achievements", () => {
  it("derives badges from stats", () => {
    const ids = achievementsFor({
      commandsUsed: 120,
      commands: new Map([["cat", 1], ["dog", 1], ["fox", 1], ["duck", 1], ["comic", 1], ["apod", 1]]),
      countingCorrect: 150,
      highestLevel: 12,
      firstSeenAt: new Date("2020-01-01"),
    }).map((a) => a.id);
    expect(ids).toEqual(["first", "regular", "zoo", "counter", "chatty", "oldtimer"]);
  });
});

describe("confessorHash", () => {
  it("is stable per server and unlinkable across servers", () => {
    const a = confessorHash("s".repeat(32), "1", "42");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(confessorHash("s".repeat(32), "1", "42")).toBe(a);
    expect(confessorHash("s".repeat(32), "2", "42")).not.toBe(a);
    expect(confessorHash("t".repeat(32), "1", "42")).not.toBe(a);
  });
});

describe("settings", () => {
  it("fills defaults and recovers corrupt sections independently", () => {
    const s = parseSettings({ levels: { enabled: true }, automod: { action: "nuke" } });
    expect(s.levels.enabled).toBe(true);
    expect(s.automod).toEqual(DEFAULT_SETTINGS.automod); // corrupt section -> defaults
    expect(s.welcome.message).toContain("{user}");
  });
  it("renders only known placeholders", () => {
    expect(
      renderTemplate("Hi {user} ({username}) to {server} #{count} {everyone} @everyone", {
        userId: "1",
        username: "nate",
        server: "Antares",
        memberCount: 1234,
      }),
    ).toBe("Hi <@1> (nate) to Antares #1,234 {everyone} @everyone");
  });
});
