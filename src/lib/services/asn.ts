import { container } from "@sapphire/framework";
import { z } from "zod";
import {
  currentPrefixes,
  parseAsn,
  parsePrefix,
  prefixFamily,
  prefixLength,
  type LookingGlassCollector,
  type NetworkState,
  type PrefixState,
  type Roa,
} from "../features/asn.js";
import { fetchJson, HttpError } from "../http.js";

/**
 * Public routing data for an AS, from RIPEstat (RIPE RIS collectors, RPKI, registry data)
 * and PeeringDB. Neither needs an API key. Responses are cached so repeated commands and
 * the route monitor stay well inside both services' fair-use limits.
 */

const RIPESTAT = "https://stat.ripe.net/data/";

const MINUTE = 60_000;
const ROUTING_TTL = 5 * MINUTE;
const REGISTRY_TTL = 60 * MINUTE;
const NAME_TTL = 24 * 60 * MINUTE;

/** Promise cache: concurrent callers share one request; failures are not cached. */
class TtlCache {
  private readonly entries = new Map<string, { at: number; ttl: number; value: Promise<unknown> }>();
  public constructor(private readonly maxEntries = 1000) {}

  public get<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && Date.now() - hit.at < hit.ttl) return hit.value as Promise<T>;
    if (this.entries.size >= this.maxEntries) this.entries.clear();
    const value = load();
    this.entries.set(key, { at: Date.now(), ttl, value });
    value.catch(() => {
      if (this.entries.get(key)?.value === value) this.entries.delete(key);
    });
    return value;
  }

  public clear() {
    this.entries.clear();
  }
}

const cache = new TtlCache();

/** For tests. */
export function clearAsnCache(): void {
  cache.clear();
}

function ripestat<T>(call: string, params: Record<string, string>, data: z.ZodType<T>, ttl: number): Promise<T> {
  const url = new URL(`${call}/data.json`, RIPESTAT);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // RIPEstat asks clients to identify themselves with `sourceapp`.
  url.searchParams.set("sourceapp", "antaresbot");
  const schema = z.object({ status: z.literal("ok"), data });
  return cache.get(url.toString(), ttl, async () => (await fetchJson(url, schema, { timeoutMs: 15_000 })).data);
}

const asResource = (asn: number) => `AS${asn}`;

// ---- RIPEstat ---------------------------------------------------------------------------

const AsOverview = z.object({ holder: z.string().nullish(), announced: z.boolean() });

export function asOverview(asn: number) {
  return ripestat("as-overview", { resource: asResource(asn) }, AsOverview, REGISTRY_TTL);
}

const Family = z.object({ ris_peers_seeing: z.number(), total_ris_peers: z.number() });
const RoutingStatus = z.object({
  first_seen: z.object({ prefix: z.string(), time: z.string() }).nullish(),
  visibility: z.object({ v4: Family, v6: Family }),
  announced_space: z.object({
    v4: z.object({ prefixes: z.number(), ips: z.number() }),
    v6: z.object({ prefixes: z.number(), "48s": z.number() }),
  }),
  observed_neighbours: z.number(),
});

export function routingStatus(asn: number) {
  return ripestat("routing-status", { resource: asResource(asn) }, RoutingStatus, ROUTING_TTL);
}

const AnnouncedPrefixes = z.object({
  prefixes: z.array(z.object({ prefix: z.string(), timelines: z.array(z.object({ endtime: z.string() })) })),
  latest_time: z.string(),
});

/** Prefixes the AS is announcing right now, IPv4 first. */
export async function announcedPrefixes(asn: number): Promise<string[]> {
  return currentPrefixes(await ripestat("announced-prefixes", { resource: asResource(asn) }, AnnouncedPrefixes, ROUTING_TTL));
}

const Neighbours = z.object({
  neighbours: z.array(
    z.object({ asn: z.number(), type: z.string(), power: z.number(), v4_peers: z.number(), v6_peers: z.number() }),
  ),
});

export type Neighbour = z.infer<typeof Neighbours>["neighbours"][number];

/** BGP neighbours. "left" = seen upstream of the AS (transit/peers), "right" = downstream. */
export async function neighbours(asn: number): Promise<Neighbour[]> {
  const data = await ripestat("asn-neighbours", { resource: asResource(asn) }, Neighbours, ROUTING_TTL);
  return [...data.neighbours].sort((a, b) => b.power - a.power || a.asn - b.asn);
}

const Rpki = z.object({
  status: z.string(),
  validating_roas: z.array(z.object({ origin: z.string(), prefix: z.string(), validity: z.string(), max_length: z.number() })),
});

export function rpkiValidation(asn: number, prefix: string) {
  return ripestat("rpki-validation", { resource: asResource(asn), prefix }, Rpki, ROUTING_TTL);
}

const PrefixOverview = z.object({
  announced: z.boolean(),
  asns: z.array(z.object({ asn: z.number(), holder: z.string().nullish() })),
  related_prefixes: z.array(z.string()),
});

export function prefixOverview(prefix: string) {
  return ripestat("prefix-overview", { resource: prefix }, PrefixOverview, ROUTING_TTL);
}

const Visibility = z.object({
  visibilities: z.array(
    z.object({
      probe: z.object({ name: z.string() }),
      ipv4_full_table_peers_not_seeing: z.array(z.unknown()),
      ipv6_full_table_peers_not_seeing: z.array(z.unknown()),
      ipv4_full_table_peer_count: z.number(),
      ipv6_full_table_peer_count: z.number(),
    }),
  ),
});

/** How many full-table RIS peers (across all collectors) see this prefix. */
export async function prefixVisibility(prefix: string): Promise<{ seeing: number; total: number }> {
  const data = await ripestat("visibility", { resource: prefix }, Visibility, ROUTING_TTL);
  const v6 = prefixFamily(prefix) === "v6";
  let seeing = 0;
  let total = 0;
  for (const v of data.visibilities) {
    const count = v6 ? v.ipv6_full_table_peer_count : v.ipv4_full_table_peer_count;
    const missing = (v6 ? v.ipv6_full_table_peers_not_seeing : v.ipv4_full_table_peers_not_seeing).length;
    total += count;
    seeing += Math.max(0, count - missing);
  }
  return { seeing, total };
}

const LookingGlass = z.object({
  rrcs: z.array(
    z.object({
      rrc: z.string(),
      location: z.string(),
      peers: z.array(z.object({ as_path: z.string(), asn_origin: z.string() })),
    }),
  ),
});

export async function lookingGlass(prefix: string): Promise<LookingGlassCollector[]> {
  return (await ripestat("looking-glass", { resource: prefix }, LookingGlass, ROUTING_TTL)).rrcs;
}

const RpkiObjects = z.object({
  metadata: z.object({ generatedTime: z.string() }).partial().optional(),
  roas: z.array(z.object({ asn: z.string(), prefix: z.string(), maxLength: z.number(), ta: z.string() })),
  routerKeys: z.array(z.unknown()),
  aspas: z.array(z.object({ customer: z.string(), providers: z.array(z.string()), ta: z.string() })),
});

export type RpkiObjects = {
  roas: Roa[];
  /** Providers in the AS's ASPA object; null if it hasn't published one. */
  aspaProviders: number[] | null;
  aspaTrustAnchor: string | null;
  routerKeys: number;
  generated: Date | null;
};

/**
 * Validated RPKI objects for an AS (Routinator's view, via RIPEstat's rpki-roas call):
 * its ROAs, router keys (BGPsec) and the ASPA where it is the customer.
 */
export async function rpkiObjects(asn: number): Promise<RpkiObjects> {
  const data = await ripestat("rpki-roas", { resource: asResource(asn) }, RpkiObjects, ROUTING_TTL);
  const roas = data.roas.flatMap((r) => {
    const origin = parseAsn(r.asn);
    const prefix = parsePrefix(r.prefix);
    return origin === asn && prefix ? [{ asn: origin, prefix, maxLength: r.maxLength, ta: r.ta }] : [];
  });
  const aspa = data.aspas.find((a) => parseAsn(a.customer) === asn);
  const generated = data.metadata?.generatedTime ? new Date(data.metadata.generatedTime) : null;
  return {
    roas,
    aspaProviders: aspa ? aspa.providers.map(parseAsn).filter((p): p is number => p !== null) : null,
    aspaTrustAnchor: aspa?.ta ?? null,
    routerKeys: data.routerKeys.length,
    generated: generated && !Number.isNaN(generated.getTime()) ? generated : null,
  };
}

const AbuseContacts =z.object({ abuse_contacts: z.array(z.string()) });

export async function abuseContacts(asn: number): Promise<string[]> {
  return (await ripestat("abuse-contact-finder", { resource: asResource(asn) }, AbuseContacts, REGISTRY_TTL)).abuse_contacts;
}

const RirCountry = z.object({ located_resources: z.array(z.object({ location: z.string() })) });

export async function registeredCountry(asn: number): Promise<string | null> {
  const data = await ripestat("rir-stats-country", { resource: asResource(asn) }, RirCountry, REGISTRY_TTL);
  return data.located_resources[0]?.location ?? null;
}

/** AS holder names for display, looked up in parallel (at most `limit`). Failures become null. */
export async function asNames(asns: readonly number[], limit = 10): Promise<Map<number, string | null>> {
  const unique = [...new Set(asns)].slice(0, limit);
  const names = await Promise.all(
    unique.map((asn) =>
      cache
        .get(`name:${asn}`, NAME_TTL, async () => (await asOverview(asn)).holder ?? null)
        .catch(() => null),
    ),
  );
  return new Map(unique.map((asn, i) => [asn, names[i] ?? null]));
}

// ---- PeeringDB --------------------------------------------------------------------------

/** PEERINGDB_URL (a cache/mirror or PeeringDB itself) + "api/". */
const peeringDbApi = () => new URL("api/", container.config.PEERINGDB_URL);

function peeringdb<T>(path: string, params: Record<string, string>, row: z.ZodType<T>): Promise<T[]> {
  const url = new URL(path, peeringDbApi());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return cache.get(url.toString(), REGISTRY_TTL, async () => {
    try {
      return (await fetchJson(url, z.object({ data: z.array(row) }))).data;
    } catch (err) {
      // PeeringDB answers 404 when nothing matches.
      if (err instanceof HttpError && err.status === 404) return [];
      throw err;
    }
  });
}

const str = z.string().nullish();
const PdbNet = z.object({
  id: z.number(),
  name: z.string(),
  aka: str,
  website: str,
  irr_as_set: str,
  info_type: str,
  info_traffic: str,
  info_ratio: str,
  info_scope: str,
  info_prefixes4: z.number().nullish(),
  info_prefixes6: z.number().nullish(),
  info_ipv6: z.boolean().nullish(),
  ix_count: z.number().nullish(),
  fac_count: z.number().nullish(),
  policy_general: str,
  policy_contracts: str,
  policy_locations: str,
  policy_url: str,
  looking_glass: str,
  status_dashboard: str,
  updated: str,
});
export type PeeringDbNet = z.infer<typeof PdbNet>;

export async function peeringDbNet(asn: number): Promise<PeeringDbNet | null> {
  return (await peeringdb("net", { asn: String(asn) }, PdbNet))[0] ?? null;
}

const PdbNetIxLan = z.object({
  // PeeringDB includes the IX name; some caches only give the ixlan id (as `ixlan`).
  name: str,
  ixlan_id: z.number().nullish(),
  ixlan: z.number().nullish(),
  speed: z.number(),
  ipaddr4: str,
  ipaddr6: str,
  is_rs_peer: z.boolean().nullish(),
  operational: z.boolean().nullish(),
});
export type PeeringDbIx = Omit<z.infer<typeof PdbNetIxLan>, "name"> & { name: string };

const PdbIxLan = z.object({ id: z.number(), ix: z.number().nullish(), ix_id: z.number().nullish() });
const PdbIxName = z.object({ id: z.number(), name: z.string() });

/** IX name for an ixlan id, via ixlan -> ix (works on PeeringDB and caches alike). */
async function ixNameForLan(ixlanId: number): Promise<string | null> {
  const lan = (await peeringdb("ixlan", { id: String(ixlanId) }, PdbIxLan))[0];
  const ixId = lan?.ix_id ?? lan?.ix;
  if (!ixId) return null;
  return (await peeringdb("ix", { id: String(ixId) }, PdbIxName))[0]?.name ?? null;
}

/** The network's IX ports. Names missing from the source are looked up (at most 10). */
export async function peeringDbIxs(netId: number): Promise<PeeringDbIx[]> {
  const rows = await peeringdb("netixlan", { net_id: String(netId) }, PdbNetIxLan);
  return Promise.all(
    rows.map(async (row, i) => {
      const lan = row.ixlan_id ?? row.ixlan;
      const looked = !row.name && lan != null && i < 10 ? await ixNameForLan(lan).catch(() => null) : null;
      return { ...row, name: row.name || looked || (lan != null ? `IX LAN #${lan}` : "Unknown IX") };
    }),
  );
}

const PdbFac = z.object({ name: z.string(), city: str, country: str });
export type PeeringDbFac = z.infer<typeof PdbFac>;

export function peeringDbFacilities(netId: number): Promise<PeeringDbFac[]> {
  return peeringdb("netfac", { net_id: String(netId) }, PdbFac);
}

// ---- Combined snapshot (used by /as202902 health and the route monitor) ----------------

/** Most prefixes we'll inspect in one snapshot (each costs three RIPEstat calls). */
export const MAX_PREFIXES = 10;

export async function prefixState(asn: number, prefix: string): Promise<PrefixState> {
  const [visibility, rpki, overview] = await Promise.all([
    prefixVisibility(prefix),
    rpkiValidation(asn, prefix),
    prefixOverview(prefix),
  ]);
  const len = prefixLength(prefix);
  return {
    prefix,
    visibility,
    rpki: rpki.status,
    origins: overview.asns.map((a) => a.asn),
    // related_prefixes are overlapping announcements; longer ones are inside ours.
    moreSpecifics: overview.related_prefixes.filter((p) => prefixFamily(p) === prefixFamily(prefix) && prefixLength(p) > len),
  };
}

export async function networkState(asn: number): Promise<NetworkState> {
  const [prefixes, nbrs, aspaProviders] = await Promise.all([
    announcedPrefixes(asn),
    neighbours(asn),
    // rpki-roas is marked "development" by RIPEstat: if it fails, skip the ASPA check
    // rather than failing the whole snapshot.
    rpkiObjects(asn).then(
      (o) => o.aspaProviders,
      () => undefined,
    ),
  ]);
  return {
    asn,
    prefixes: await Promise.all(prefixes.slice(0, MAX_PREFIXES).map((p) => prefixState(asn, p))),
    upstreams: nbrs.filter((n) => n.type === "left").map((n) => n.asn),
    aspaProviders,
  };
}
