import { describe, expect, it } from "vitest";
import { applyLegacyEnv, loadConfig } from "../src/lib/config.js";

const TOKEN = "x".repeat(72);
const valid = {
  BOT_TOKEN: TOKEN,
  BOT_MONGO_PATH: "mongodb://u:p@mongo:27017/antaresbot?authSource=antaresbot",
  BOT_OWNER_IDS: "603629606154666024",
};

describe("loadConfig", () => {
  it("parses a minimal valid environment", () => {
    const c = loadConfig(valid);
    expect(c.BOT_OWNER_IDS).toEqual(["603629606154666024"]);
    expect(c.DEV_GUILD_IDS).toEqual([]);
    expect(c.NASA_API_KEY).toBeUndefined();
  });

  it("keeps chat logging off unless CHAT_LOG is turned on", () => {
    expect(loadConfig(valid).CHAT_LOG).toBe(false);
    expect(loadConfig({ ...valid, CHAT_LOG: "" }).CHAT_LOG).toBe(false);
    expect(loadConfig({ ...valid, CHAT_LOG: "false" }).CHAT_LOG).toBe(false);
    expect(loadConfig({ ...valid, CHAT_LOG: "true" }).CHAT_LOG).toBe(true);
    expect(loadConfig({ ...valid, CHAT_LOG: "1" }).CHAT_LOG).toBe(true);
    expect(() => loadConfig({ ...valid, CHAT_LOG: "maybe" })).toThrow(/CHAT_LOG/);
  });

  it("splits comma-separated ID lists", () => {
    const c = loadConfig({ ...valid, DEV_GUILD_IDS: "788541416740487218, 775216104012120124" });
    expect(c.DEV_GUILD_IDS).toEqual(["788541416740487218", "775216104012120124"]);
  });

  it("requires at least one owner", () => {
    expect(() => loadConfig({ ...valid, BOT_OWNER_IDS: "" })).toThrow(/BOT_OWNER_IDS/);
  });

  it("rejects non-snowflake IDs", () => {
    expect(() => loadConfig({ ...valid, BOT_OWNER_IDS: "abc" })).toThrow(/BOT_OWNER_IDS/);
  });

  it("only accepts a local mongodb:// URI (no cloud SRV)", () => {
    expect(() => loadConfig({ ...valid, BOT_MONGO_PATH: "mongodb+srv://u:p@cluster.example.net/db" })).toThrow(
      /BOT_MONGO_PATH/,
    );
  });

  it("never echoes secret values in validation errors", () => {
    const secret = "mongodb+srv://admin:SuperSecret123@x/db";
    try {
      loadConfig({ ...valid, BOT_MONGO_PATH: secret });
      expect.unreachable();
    } catch (e) {
      expect(String(e)).not.toContain("SuperSecret123");
    }
  });

  it("requires https for the uptime push URL", () => {
    expect(() => loadConfig({ ...valid, UPTIME_KUMA_PUSH_URL: "http://status.example.com/api/push/x" })).toThrow();
    expect(loadConfig({ ...valid, UPTIME_KUMA_PUSH_URL: "https://status.example.com/api/push/x" }).UPTIME_KUMA_PUSH_URL).toBe(
      "https://status.example.com/api/push/x",
    );
  });
});

describe("applyLegacyEnv (v1 .env compatibility)", () => {
  it("maps v1 names onto v2 names", () => {
    const out = applyLegacyEnv({
      BOT_OWNER_ID: "603629606154666024",
      TEST_SERVERS: "788541416740487218",
      UPTIME_KUMA_MONITOR_DOMAIN: "status.example.com",
      UPTIME_KUMA_MONITOR_ID: "abc/../x",
    });
    expect(out.BOT_OWNER_IDS).toBe("603629606154666024");
    expect(out.DEV_GUILD_IDS).toBe("788541416740487218");
    expect(out.UPTIME_KUMA_PUSH_URL).toBe("https://status.example.com/api/push/abc%2F..%2Fx");
  });

  it("prefers v2 names when both are present", () => {
    expect(applyLegacyEnv({ BOT_OWNER_ID: "1", BOT_OWNER_IDS: "2" }).BOT_OWNER_IDS).toBe("2");
  });
});
