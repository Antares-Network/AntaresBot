import { describe, expect, it } from "vitest";
import { MC_USERNAME } from "../src/commands/user/mcuser.js";
import { PRIVACY_POLICY } from "../src/commands/user/privacy.js";
import { SNEEZES } from "../src/commands/user/sneeze.js";
import { helpPage } from "../src/lib/help.js";
import { formatUptime, pick, toSnowflake } from "../src/lib/util.js";

describe("toSnowflake (legacy channel IDs)", () => {
  it("accepts a bare ID", () => { expect(toSnowflake("788541416740487218")).toBe("788541416740487218"); });
  it("unwraps a v1 channel mention", () => { expect(toSnowflake("<#788541416740487218>")).toBe("788541416740487218"); });
  it.each([null, undefined, 123, "", "abc", "<#123>", "<@788541416740487218>", "<#788541416740487218", "788541416740487218>"])(
    "rejects %j",
    (v) => { expect(toSnowflake(v)).toBeNull(); },
  );
});

describe("formatUptime", () => {
  it("formats d/h/m/s", () => {
    expect(formatUptime(((1 * 24 + 2) * 60 * 60 + 3 * 60 + 4) * 1000)).toBe("1d 2h 3m 4s");
    expect(formatUptime(0)).toBe("0d 0h 0m 0s");
  });
});

describe("pick", () => {
  it("returns an element of the array", () => {
    for (let i = 0; i < 50; i++) expect(SNEEZES).toContain(pick(SNEEZES));
  });
  it("throws on empty arrays", () => { expect(() => pick([])).toThrow(RangeError); });
  it("sneezes are never empty (v1 bug)", () => { expect(SNEEZES.every((s) => s.length > 0)).toBe(true); });
  it("privacy policy fits in one embed", () => { expect(PRIVACY_POLICY.length).toBeLessThanOrEqual(4096); });
});

describe("MC_USERNAME", () => {
  it.each(["Notch", "jeb_", "abc", "A".repeat(16)])("accepts %s", (n) => { expect(MC_USERNAME.test(n)).toBe(true); });
  it.each(["ab", "A".repeat(17), "../users", "a b", "name?x=1", "näme"])("rejects %s", (n) => { expect(MC_USERNAME.test(n)).toBe(false); },
  );
});

describe("helpPage", () => {
  it("finds real pages", () => { expect(helpPage("images")?.label).toBe("Random Images"); });
  it("has no disabled placeholder pages left", () => { expect(helpPage("skills")?.disabled).toBeUndefined(); });
  it.each(["__proto__", "constructor", "toString", "nope", ""])("ignores %j", (k) => { expect(helpPage(k)).toBeUndefined(); });
});
