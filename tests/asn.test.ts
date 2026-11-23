import { describe, expect, it } from "vitest";
import {
  analyzeAspa,
  analyzeRoas,
  mergeUpstreams,
  parseAsn,
  prefixContains,
  type Roa,
  currentPrefixes,
  evaluateHealth,
  hasEvents,
  initialMonitorState,
  parseAsPath,
  parsePrefix,
  percent,
  ripeTime,
  stepMonitor,
  summarizeRoutes,
  type NetworkState,
} from "../src/lib/features/asn.js";

const ASN = 202902;
const P6 = "2a0f:85c1:e16::/48";

const healthy = (over: Partial<NetworkState> = {}): NetworkState => ({
  asn: ASN,
  prefixes: [{ prefix: P6, visibility: { seeing: 310, total: 310 }, rpki: "valid", origins: [ASN], moreSpecifics: [] }],
  upstreams: [20473, 209735],
  ...over,
});

describe("parsePrefix", () => {
  it.each([
    [P6, P6],
    [" 2A0F:85C1:E16::/48 ", P6],
    ["192.0.2.0/24", "192.0.2.0/24"],
    ["10.0.0.0/08", "10.0.0.0/8"],
  ])("%s -> %s", (input, out) => {
    expect(parsePrefix(input)).toBe(out);
  });
  it.each(["", "2a0f::", "192.0.2.0/33", "2a0f::/129", "example.com/24", "1.2.3.4/24/1", "1.2.3.4/-1", "1.2.3.4/abc"])(
    "rejects %j",
    (input) => {
      expect(parsePrefix(input)).toBeNull();
    },
  );
});

describe("parseAsPath", () => {
  it("collapses prepends and drops AS-sets", () => {
    expect(parseAsPath("2500 6939 44355 209735 202902 202902")).toEqual([2500, 6939, 44355, 209735, 202902]);
    expect(parseAsPath("1 2 {3,4} 5")).toEqual([1, 2, 5]);
    expect(parseAsPath("")).toEqual([]);
  });
});

describe("ripeTime / percent", () => {
  it("treats zone-less RIPEstat times as UTC", () => {
    expect(ripeTime("2025-12-17T08:00:00")?.toISOString()).toBe("2025-12-17T08:00:00.000Z");
    expect(ripeTime("2025-12-17T08:00:00Z")?.toISOString()).toBe("2025-12-17T08:00:00.000Z");
    expect(ripeTime("nope")).toBeNull();
    expect(ripeTime(undefined)).toBeNull();
  });
  it("formats percentages", () => {
    expect(percent(310, 310)).toBe("100%");
    expect(percent(1, 3)).toBe("33.3%");
    expect(percent(0, 0)).toBe("0%");
  });
});

describe("currentPrefixes", () => {
  it("keeps only prefixes whose timeline reaches the latest data point", () => {
    const latest = "2026-11-20T08:00:00";
    expect(
      currentPrefixes({
        latest_time: latest,
        prefixes: [
          { prefix: P6, timelines: [{ endtime: latest }] },
          { prefix: "2a0f:85c1:e17::/48", timelines: [{ endtime: "2026-11-10T08:00:00" }] },
          { prefix: "192.0.2.0/24", timelines: [{ endtime: "2026-11-01T00:00:00" }, { endtime: latest }] },
        ],
      }),
    ).toEqual(["192.0.2.0/24", P6]);
  });
});

describe("summarizeRoutes", () => {
  it("summarises paths, upstream share and foreign origins", () => {
    const r = summarizeRoutes(
      [
        {
          rrc: "RRC06",
          location: "Tokyo",
          peers: [
            { as_path: "2497 3257 20473 202902", asn_origin: "202902" },
            { as_path: "2500 6939 44355 209735 202902 202902", asn_origin: "202902" },
          ],
        },
        { rrc: "RRC16", location: "Miami", peers: [{ as_path: "6939 44355 209735 202902", asn_origin: "202902" }] },
        { rrc: "RRC99", location: "Nowhere", peers: [] },
        { rrc: "RRC00", location: "Amsterdam", peers: [{ as_path: "174 666", asn_origin: "666" }] },
      ],
      ASN,
    );
    expect(r.collectors).toBe(3);
    expect(r.peers).toBe(4);
    expect(r.uniquePaths).toBe(3);
    expect(r.minLength).toBe(4);
    expect(r.maxLength).toBe(5);
    expect(r.avgLength).toBeCloseTo(13 / 3);
    expect(r.upstreams).toEqual([
      { asn: 209735, peers: 2 },
      { asn: 20473, peers: 1 },
    ]);
    expect(r.transits[0]).toEqual({ asn: 6939, peers: 2 });
    expect(r.otherOrigins).toEqual([666]);
    expect(r.samplePaths[0]).toEqual([2497, 3257, 20473, 202902]);
  });

  it("handles an empty looking glass", () => {
    const r = summarizeRoutes([], ASN);
    expect(r).toMatchObject({ collectors: 0, peers: 0, uniquePaths: 0, minLength: 0, maxLength: 0, avgLength: 0 });
  });
});

describe("evaluateHealth", () => {
  it("passes a healthy network", () => {
    expect(evaluateHealth(healthy()).every((c) => c.ok)).toBe(true);
  });

  it("flags low visibility, bad RPKI, foreign origins, more-specifics and single upstream", () => {
    const checks = evaluateHealth(
      healthy({
        prefixes: [
          { prefix: P6, visibility: { seeing: 100, total: 310 }, rpki: "invalid_asn", origins: [ASN, 666], moreSpecifics: ["2a0f:85c1:e16::/49"] },
        ],
        upstreams: [20473],
      }),
    );
    const failing = checks.filter((c) => !c.ok).map((c) => c.key);
    expect(failing).toEqual([`visibility:${P6}`, `rpki:${P6}`, `origin:${P6}`, `more-specific:${P6}`, "upstreams"]);
  });

  it("reports expected prefixes that disappeared", () => {
    const checks = evaluateHealth(healthy({ prefixes: [] }), { expectedPrefixes: [P6] });
    expect(checks.find((c) => c.key === `announced:${P6}`)?.ok).toBe(false);
  });

  it("treats zero full-table peers as not visible", () => {
    const checks = evaluateHealth(
      healthy({ prefixes: [{ prefix: P6, visibility: { seeing: 0, total: 0 }, rpki: "valid", origins: [ASN], moreSpecifics: [] }] }),
    );
    expect(checks.find((c) => c.key === `visibility:${P6}`)?.ok).toBe(false);
  });
});

describe("parseAsn", () => {
  it.each([
    ["AS20473", 20473],
    ["as20473", 20473],
    ["202902", 202902],
    [64512, 64512],
    ["AS4294967295", 4294967295],
  ])("%j -> %d", (input, out) => {
    expect(parseAsn(input)).toBe(out);
  });
  it.each(["", "AS", "AS-TERIT", "AS4294967296", "12a", "AS 1"])("rejects %j", (input) => {
    expect(parseAsn(input)).toBeNull();
  });
});

describe("prefixContains", () => {
  it.each([
    ["2a0f:85c1::/32", P6, true],
    [P6, P6, true],
    [P6, "2a0f:85c1:e16:ff00::/56", true],
    [P6, "2a0f:85c1:e17::/48", false],
    [P6, "2a0f:85c1::/32", false], // shorter isn't inside
    ["2a0f:85c1:e00::/44", P6, false], // e00::/44 ends at e0f
    ["2a0f:85c1:e10::/44", P6, true],
    ["192.0.2.0/24", "192.0.2.128/25", true],
    ["192.0.2.0/24", "192.0.3.0/25", false],
    ["0.0.0.0/0", "203.0.113.0/24", true],
    ["::/0", P6, true],
    ["192.0.2.0/24", P6, false], // different families
    ["::ffff:0:0/96", "::ffff:192.0.2.0/120", true], // embedded IPv4
    ["bogus", P6, false],
  ])("%s contains %s: %s", (outer, inner, expected) => {
    expect(prefixContains(outer, inner)).toBe(expected);
  });
});

describe("analyzeRoas", () => {
  const roa = (prefix: string, maxLength: number): Roa => ({ asn: ASN, prefix, maxLength, ta: "RIPE NCC RPKI Root" });

  it("matches ROAs to announced prefixes and flags loose, unused and uncovered", () => {
    const r = analyzeRoas(
      [roa(P6, 48), roa("2a0f:85c1:e10::/44", 48), roa("192.0.2.0/24", 24)],
      [P6, "198.51.100.0/24"],
    );
    expect(r.roas.map((x) => [x.roa.prefix, x.covers, x.loose])).toEqual([
      [P6, [P6], false],
      // e10::/44 spans e10-e1f, so with maxLength /48 it covers our e16::/48 exactly.
      ["2a0f:85c1:e10::/44", [P6], false],
      ["192.0.2.0/24", [], false],
    ]);
    expect(r.uncovered).toEqual(["198.51.100.0/24"]);
  });

  it("flags a maxLength longer than anything announced", () => {
    const r = analyzeRoas([roa("2a0f:85c1:e00::/44", 48)], ["2a0f:85c1:e00::/44"]);
    expect(r.roas[0]?.loose).toBe(true);
  });

  it("does not count a prefix longer than maxLength as covered", () => {
    const r = analyzeRoas([roa("2a0f:85c1::/32", 32)], [P6]);
    expect(r.roas[0]?.covers).toEqual([]);
    expect(r.uncovered).toEqual([P6]);
  });
});

describe("analyzeAspa", () => {
  it("compares authorised providers with observed upstreams", () => {
    const a = analyzeAspa(
      [209735, 20473, 209533, 212895],
      [
        { asn: 209735, peers: 213 },
        { asn: 20473, peers: 139 },
        { asn: 666, peers: 8 },
      ],
    );
    expect(a.providers).toEqual([20473, 209533, 209735, 212895]);
    expect(a.unlisted).toEqual([666]);
    expect(a.unseen).toEqual([209533, 212895]);
    expect(a.pathsChecked).toBe(360);
    expect(a.pathsAuthorised).toBe(352);
  });

  it("merges upstream counts across prefixes", () => {
    expect(
      mergeUpstreams([
        [
          { asn: 1, peers: 2 },
          { asn: 2, peers: 5 },
        ],
        [{ asn: 1, peers: 4 }],
      ]),
    ).toEqual([
      { asn: 1, peers: 6 },
      { asn: 2, peers: 5 },
    ]);
  });
});

describe("evaluateHealth: ASPA", () => {
  const aspa = (s: NetworkState) => evaluateHealth(s).find((c) => c.key === "aspa");

  it("passes when every upstream is an authorised provider", () => {
    expect(aspa(healthy({ aspaProviders: [20473, 209735, 212895] }))?.ok).toBe(true);
  });
  it("fails for an unauthorised upstream", () => {
    const c = aspa(healthy({ aspaProviders: [20473] }));
    expect(c?.ok).toBe(false);
    expect(c?.detail).toContain("AS209735");
  });
  it("fails when no ASPA is published", () => {
    expect(aspa(healthy({ aspaProviders: null }))?.ok).toBe(false);
  });
  it("is skipped when ASPA data is unavailable", () => {
    expect(aspa(healthy({ aspaProviders: undefined }))).toBeUndefined();
  });
});

describe("stepMonitor", () => {
  it("keeps a problem open while its check can't run, and recovers when it passes", () => {
    let s = stepMonitor(initialMonitorState(), healthy({ aspaProviders: [20473] })).state;
    expect(Object.keys(s.failing)).toEqual(["aspa"]);

    const unknown = stepMonitor(s, healthy({ aspaProviders: undefined }));
    expect(hasEvents(unknown.events)).toBe(false);
    s = unknown.state;
    expect(Object.keys(s.failing)).toEqual(["aspa"]);

    const fixed = stepMonitor(s, healthy({ aspaProviders: [20473, 209735] }));
    expect(fixed.events.recovered.map((c) => c.key)).toEqual(["aspa"]);
  });

  it("is silent when the first tick is healthy, and when nothing changes", () => {
    const first = stepMonitor(initialMonitorState(), healthy());
    expect(hasEvents(first.events)).toBe(false);
    const second = stepMonitor(first.state, healthy());
    expect(hasEvents(second.events)).toBe(false);
  });

  it("alerts once per problem, then reports recovery", () => {
    let s = stepMonitor(initialMonitorState(), healthy()).state;
    const bad = healthy({
      prefixes: [{ prefix: P6, visibility: { seeing: 310, total: 310 }, rpki: "invalid_asn", origins: [ASN], moreSpecifics: [] }],
    });

    const t1 = stepMonitor(s, bad);
    expect(t1.events.problems.map((c) => c.key)).toEqual([`rpki:${P6}`]);
    s = t1.state;

    const t2 = stepMonitor(s, bad);
    expect(hasEvents(t2.events)).toBe(false);
    s = t2.state;

    const t3 = stepMonitor(s, healthy());
    expect(t3.events.problems).toEqual([]);
    expect(t3.events.recovered.map((c) => [c.key, c.ok])).toEqual([[`rpki:${P6}`, true]]);
  });

  it("remembers prefixes and alerts when one is withdrawn, then recovers", () => {
    const s = stepMonitor(initialMonitorState(), healthy()).state;
    const gone = stepMonitor(s, healthy({ prefixes: [] }));
    expect(gone.events.problems.map((c) => c.key)).toContain(`announced:${P6}`);
    const back = stepMonitor(gone.state, healthy());
    expect(back.events.recovered.map((c) => c.key)).toContain(`announced:${P6}`);
  });

  it("reports upstream changes, but not on the first tick", () => {
    const first = stepMonitor(initialMonitorState(), healthy({ upstreams: [20473, 209735] }));
    expect(first.events.upstreamsAdded).toEqual([]);
    const next = stepMonitor(first.state, healthy({ upstreams: [209735, 6939] }));
    expect(next.events.upstreamsAdded).toEqual([6939]);
    expect(next.events.upstreamsRemoved).toEqual([20473]);
  });
});
