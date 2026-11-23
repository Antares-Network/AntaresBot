import { isIP } from "node:net";

/**
 * Pure helpers for the /as202902 command and the route monitor: parsing RIPEstat data,
 * summarising BGP paths and turning a network snapshot into health checks. No I/O here.
 */

export type Family = "v4" | "v6";

export const prefixFamily = (prefix: string): Family => (prefix.includes(":") ? "v6" : "v4");

export function prefixLength(prefix: string): number {
  return Number(prefix.slice(prefix.lastIndexOf("/") + 1));
}

/** Validate and normalise "addr/len" (IPv4 or IPv6). Returns null for anything else. */
export function parsePrefix(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  const slash = trimmed.indexOf("/");
  if (slash < 1 || slash !== trimmed.lastIndexOf("/")) return null;
  const addr = trimmed.slice(0, slash);
  const len = trimmed.slice(slash + 1);
  if (!/^\d{1,3}$/.test(len)) return null;
  const version = isIP(addr);
  const max = version === 4 ? 32 : version === 6 ? 128 : -1;
  if (max < 0 || Number(len) > max) return null;
  return `${addr}/${Number(len)}`;
}

/** "AS20473" / "20473" -> 20473; null if it isn't a valid ASN. */
export function parseAsn(value: string | number): number | null {
  const m = /^(?:AS)?(\d{1,10})$/i.exec(String(value).trim());
  if (!m) return null;
  const n = Number(m[1]);
  return n <= 4_294_967_295 ? n : null;
}

/** Address part of a prefix as a bigint plus its bit width; null if unparseable. */
function addressValue(addr: string): { bits: number; value: bigint } | null {
  const version = isIP(addr);
  if (version === 4) {
    return { bits: 32, value: addr.split(".").reduce((acc, o) => (acc << 8n) | BigInt(Number(o)), 0n) };
  }
  if (version !== 6) return null;
  let text = addr;
  // Embedded IPv4 tail (::ffff:192.0.2.1) -> two hex groups. isIP already validated it.
  const lastColon = text.lastIndexOf(":");
  const tailPart = text.slice(lastColon + 1);
  if (tailPart.includes(".")) {
    const [a = 0, b = 0, c = 0, d = 0] = tailPart.split(".").map(Number);
    text = `${text.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head = "", tail] = text.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = tail === undefined ? left : [...left, ...Array<string>(8 - left.length - right.length).fill("0"), ...right];
  return { bits: 128, value: groups.reduce((acc, g) => (acc << 16n) | BigInt(parseInt(g || "0", 16)), 0n) };
}

/** True if `inner` is equal to or inside `outer` (same address family). */
export function prefixContains(outer: string, inner: string): boolean {
  const o = parsePrefix(outer);
  const i = parsePrefix(inner);
  if (!o || !i || prefixFamily(o) !== prefixFamily(i)) return false;
  const oLen = prefixLength(o);
  if (prefixLength(i) < oLen) return false;
  const ov = addressValue(o.slice(0, o.lastIndexOf("/")));
  const iv = addressValue(i.slice(0, i.lastIndexOf("/")));
  if (!ov || !iv) return false;
  const shift = BigInt(ov.bits - oLen);
  return ov.value >> shift === iv.value >> shift;
}

/** RIPEstat timestamps have no zone ("2025-12-17T08:00:00") but are UTC. */
export function ripeTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const t = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(t) ? null : new Date(t);
}

/**
 * RIPEstat's announced-prefixes covers the last two weeks. A prefix is announced *now*
 * only if one of its timelines runs up to the latest data point.
 */
export function currentPrefixes(data: {
  prefixes: { prefix: string; timelines: { endtime: string }[] }[];
  latest_time: string;
}): string[] {
  const live = data.prefixes.filter((p) => p.timelines.some((t) => t.endtime === data.latest_time)).map((p) => p.prefix);
  // IPv4 before IPv6, then by length (shortest first), then text: stable, readable order.
  return [...new Set(live)].sort(
    (a, b) =>
      prefixFamily(a).localeCompare(prefixFamily(b)) || prefixLength(a) - prefixLength(b) || a.localeCompare(b),
  );
}

/** "2500 6939 209735 202902 202902" -> [2500, 6939, 209735, 202902]. Drops AS-sets and prepends. */
export function parseAsPath(path: string): number[] {
  const out: number[] = [];
  for (const token of path.trim().split(/\s+/)) {
    if (!/^\d{1,10}$/.test(token)) continue;
    const asn = Number(token);
    if (out.at(-1) !== asn) out.push(asn);
  }
  return out;
}

export function percent(part: number, total: number): string {
  if (total <= 0) return "0%";
  const p = (part / total) * 100;
  return `${p >= 99.95 || p === 0 ? p.toFixed(0) : p.toFixed(1)}%`;
}

export type LookingGlassCollector = {
  rrc: string;
  location: string;
  peers: { as_path: string; asn_origin: string }[];
};

export type RouteSummary = {
  collectors: number;
  peers: number;
  uniquePaths: number;
  minLength: number;
  maxLength: number;
  avgLength: number;
  /** The AS directly before the origin, by how many RIS peers route through it. */
  upstreams: { asn: number; peers: number }[];
  /** Networks seen on the path (excluding the origin), most common first. */
  transits: { asn: number; peers: number }[];
  /** Origins other than the expected one: a possible hijack or misconfiguration. */
  otherOrigins: number[];
  /** A few of the shortest distinct paths, as AS numbers. */
  samplePaths: number[][];
};

const countDesc = (m: Map<number, number>) =>
  [...m].map(([asn, peers]) => ({ asn, peers })).sort((a, b) => b.peers - a.peers || a.asn - b.asn);

/** Summarise a RIPEstat looking-glass response for one prefix. */
export function summarizeRoutes(collectors: LookingGlassCollector[], originAsn: number): RouteSummary {
  const upstreams = new Map<number, number>();
  const transits = new Map<number, number>();
  const otherOrigins = new Set<number>();
  const paths = new Map<string, number[]>();
  let peers = 0;
  let originPaths = 0;
  let seenCollectors = 0;
  let totalLength = 0;
  let minLength = Infinity;
  let maxLength = 0;

  for (const rrc of collectors) {
    let any = false;
    for (const peer of rrc.peers) {
      const path = parseAsPath(peer.as_path);
      const origin = path.at(-1);
      if (origin === undefined) continue;
      any = true;
      peers++;
      if (origin !== originAsn) {
        otherOrigins.add(origin);
        continue;
      }
      originPaths++;
      totalLength += path.length;
      minLength = Math.min(minLength, path.length);
      maxLength = Math.max(maxLength, path.length);
      paths.set(path.join(" "), path);
      const upstream = path.at(-2);
      if (upstream !== undefined) upstreams.set(upstream, (upstreams.get(upstream) ?? 0) + 1);
      for (const asn of new Set(path.slice(0, -1))) transits.set(asn, (transits.get(asn) ?? 0) + 1);
    }
    if (any) seenCollectors++;
  }

  return {
    collectors: seenCollectors,
    peers,
    uniquePaths: paths.size,
    minLength: originPaths ? minLength : 0,
    maxLength,
    avgLength: originPaths ? totalLength / originPaths : 0,
    upstreams: countDesc(upstreams),
    transits: countDesc(transits),
    otherOrigins: [...otherOrigins].sort((a, b) => a - b),
    samplePaths: [...paths.values()].sort((a, b) => a.length - b.length || a.join(" ").localeCompare(b.join(" "))).slice(0, 5),
  };
}

// ---------------------------------------------------------------------------------------
// RPKI: ROAs and ASPA
// ---------------------------------------------------------------------------------------

export type Roa = { asn: number; prefix: string; maxLength: number; ta: string };

export type RoaAnalysis = {
  roas: {
    roa: Roa;
    /** Announced prefixes this ROA makes valid. */
    covers: string[];
    /** maxLength allows longer prefixes than are announced (RFC 9319: forged-origin sub-prefix risk). */
    loose: boolean;
  }[];
  /** Announced prefixes no ROA covers (RPKI "unknown", or invalid if another AS's ROA covers them). */
  uncovered: string[];
};

export function analyzeRoas(roas: readonly Roa[], announced: readonly string[]): RoaAnalysis {
  const covered = new Set<string>();
  const out = roas.map((roa) => {
    const covers = announced.filter((p) => prefixContains(roa.prefix, p) && prefixLength(p) <= roa.maxLength);
    for (const p of covers) covered.add(p);
    const longestUsed = Math.max(prefixLength(roa.prefix), ...covers.map(prefixLength));
    return { roa, covers, loose: roa.maxLength > longestUsed };
  });
  return { roas: out, uncovered: announced.filter((p) => !covered.has(p)) };
}

export type AspaAnalysis = {
  providers: number[];
  /** Upstreams seen on real paths, with how many RIS peers route through each. */
  observed: { asn: number; peers: number; authorised: boolean }[];
  /** Seen upstream but not in the ASPA: ASPA-validating networks will reject those paths. */
  unlisted: number[];
  /** Authorised but not currently carrying routes (backup, or stale entries). */
  unseen: number[];
  /** Share of observed paths whose hop into our AS is an authorised provider. */
  pathsChecked: number;
  pathsAuthorised: number;
};

/**
 * Compare an ASPA provider set with the upstream hops seen in the global table.
 * This checks our own hop only; full ASPA path verification also needs every other AS's ASPA.
 */
export function analyzeAspa(providers: readonly number[], upstreams: readonly { asn: number; peers: number }[]): AspaAnalysis {
  const set = new Set(providers);
  const observed = upstreams.map((u) => ({ ...u, authorised: set.has(u.asn) }));
  const seen = new Set(upstreams.map((u) => u.asn));
  return {
    providers: [...set].sort((a, b) => a - b),
    observed,
    unlisted: observed.filter((o) => !o.authorised).map((o) => o.asn),
    unseen: [...set].filter((p) => !seen.has(p)).sort((a, b) => a - b),
    pathsChecked: observed.reduce((a, o) => a + o.peers, 0),
    pathsAuthorised: observed.filter((o) => o.authorised).reduce((a, o) => a + o.peers, 0),
  };
}

/** Merge upstream counts from several prefixes' route summaries. */
export function mergeUpstreams(lists: readonly (readonly { asn: number; peers: number }[])[]): { asn: number; peers: number }[] {
  const m = new Map<number, number>();
  for (const list of lists) for (const u of list) m.set(u.asn, (m.get(u.asn) ?? 0) + u.peers);
  return countDesc(m);
}

// ---------------------------------------------------------------------------------------
// Health checks + monitor state machine
// ---------------------------------------------------------------------------------------

export type PrefixState = {
  prefix: string;
  /** Full-table RIS peers that see the prefix, out of all full-table peers for its family. */
  visibility: { seeing: number; total: number };
  /** RIPEstat RPKI status for (origin, prefix): "valid", "invalid_asn", "unknown", ... */
  rpki: string;
  /** Every AS currently originating this exact prefix. */
  origins: number[];
  /** More-specific prefixes of ours that someone is announcing. */
  moreSpecifics: string[];
};

export type NetworkState = {
  asn: number;
  prefixes: PrefixState[];
  /** Neighbour ASNs seen upstream of us (RIPEstat "left" neighbours). */
  upstreams: number[];
  /** ASPA providers: null = no ASPA published, undefined = couldn't be fetched (check skipped). */
  aspaProviders?: number[] | null;
};

export type Check = { key: string; ok: boolean; label: string; detail: string };

export const DEFAULT_MIN_VISIBILITY = 0.8;

/** Turn a snapshot into pass/fail checks. Stable `key`s let the monitor alert on changes only. */
export function evaluateHealth(
  state: NetworkState,
  { minVisibility = DEFAULT_MIN_VISIBILITY, expectedPrefixes = [] as readonly string[] } = {},
): Check[] {
  const checks: Check[] = [];
  const announced = new Set(state.prefixes.map((p) => p.prefix));

  checks.push({
    key: "announced",
    ok: announced.size > 0,
    label: "Announcing prefixes",
    detail: announced.size ? `${announced.size} prefix(es) in the global table` : `AS${state.asn} has no visible prefixes`,
  });
  for (const prefix of new Set([...expectedPrefixes, ...announced])) {
    const ok = announced.has(prefix);
    checks.push({ key: `announced:${prefix}`, ok, label: `${prefix} announced`, detail: ok ? "In the global table" : "No longer seen in the global table" });
  }

  for (const p of state.prefixes) {
    const { seeing, total } = p.visibility;
    checks.push({
      key: `visibility:${p.prefix}`,
      ok: total > 0 && seeing / total >= minVisibility,
      label: `${p.prefix} visibility`,
      detail: `${seeing}/${total} RIS full-table peers (${percent(seeing, total)})`,
    });
    checks.push({
      key: `rpki:${p.prefix}`,
      ok: p.rpki === "valid",
      label: `${p.prefix} RPKI`,
      detail: p.rpki === "valid" ? "ROA valid" : `Status: ${p.rpki}`,
    });
    const foreign = p.origins.filter((o) => o !== state.asn);
    checks.push({
      key: `origin:${p.prefix}`,
      ok: foreign.length === 0,
      label: `${p.prefix} origin`,
      detail: foreign.length ? `Also originated by ${foreign.map((a) => `AS${a}`).join(", ")}` : `Only AS${state.asn}`,
    });
    checks.push({
      key: `more-specific:${p.prefix}`,
      ok: p.moreSpecifics.length === 0,
      label: `${p.prefix} more-specifics`,
      detail: p.moreSpecifics.length ? `Seen: ${p.moreSpecifics.slice(0, 5).join(", ")}` : "None announced",
    });
  }

  checks.push({
    key: "upstreams",
    ok: state.upstreams.length >= 2,
    label: "Upstream redundancy",
    detail: state.upstreams.length ? `${state.upstreams.length} upstream(s): ${state.upstreams.map((a) => `AS${a}`).join(", ")}` : "No upstreams seen",
  });

  if (state.aspaProviders !== undefined) {
    const providers = new Set(state.aspaProviders ?? []);
    const unlisted = state.upstreams.filter((u) => !providers.has(u));
    checks.push({
      key: "aspa",
      ok: state.aspaProviders !== null && unlisted.length === 0,
      label: "ASPA",
      detail:
        state.aspaProviders === null
          ? "No ASPA object published"
          : unlisted.length
            ? `Upstream(s) not authorised: ${unlisted.map((a) => `AS${a}`).join(", ")}`
            : `All ${state.upstreams.length} upstream(s) authorised (${providers.size} provider(s) listed)`,
    });
  }
  return checks;
}

export type MonitorState = {
  /** Prefixes seen at least once since start: withdrawing one later is an alert. */
  known: string[];
  /** Checks currently failing, by key (so we alert once per problem, not every tick). */
  failing: Record<string, Check>;
  /** Upstreams at the previous tick; null before the first one. */
  upstreams: number[] | null;
};

export type MonitorEvents = {
  problems: Check[];
  recovered: Check[];
  upstreamsAdded: number[];
  upstreamsRemoved: number[];
};

export const initialMonitorState = (): MonitorState => ({ known: [], failing: {}, upstreams: null });

export const hasEvents = (e: MonitorEvents) =>
  e.problems.length + e.recovered.length + e.upstreamsAdded.length + e.upstreamsRemoved.length > 0;

/** One monitor tick: new state plus what changed since the last tick. */
export function stepMonitor(
  prev: MonitorState,
  state: NetworkState,
  opts: { minVisibility?: number } = {},
): { state: MonitorState; events: MonitorEvents } {
  const known = [...new Set([...prev.known, ...state.prefixes.map((p) => p.prefix)])];
  const checks = evaluateHealth(state, { ...opts, expectedPrefixes: known });

  const failing: Record<string, Check> = {};
  const problems: Check[] = [];
  for (const c of checks) {
    if (c.ok) continue;
    failing[c.key] = c;
    if (!Object.hasOwn(prev.failing, c.key)) problems.push(c);
  }
  const passing = new Map(checks.filter((c) => c.ok).map((c) => [c.key, c]));
  const recovered: Check[] = [];
  for (const [key, check] of Object.entries(prev.failing)) {
    if (Object.hasOwn(failing, key)) continue;
    const now = passing.get(key);
    // Only a check that ran and passed counts as recovered. One that didn't run this tick
    // (a withdrawn prefix's visibility, ASPA data unavailable) stays failing until it does.
    if (now) recovered.push(now);
    else failing[key] = check;
  }

  const before = new Set(prev.upstreams ?? state.upstreams);
  const now = new Set(state.upstreams);
  return {
    state: { known, failing, upstreams: [...state.upstreams] },
    events: {
      problems,
      recovered,
      upstreamsAdded: state.upstreams.filter((a) => !before.has(a)),
      upstreamsRemoved: [...before].filter((a) => !now.has(a)),
    },
  };
}
