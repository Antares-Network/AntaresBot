import { Command, UserError } from "@sapphire/framework";
import { escapeMarkdown, time } from "discord.js";
import { registerGuildCommand } from "../../lib/commands.js";
import { NETWORK_ASN, NETWORK_SITE_URL } from "../../lib/constants.js";
import { brandEmbed, networkLinkRow, truncate } from "../../lib/embeds.js";
import {
  analyzeAspa,
  analyzeRoas,
  evaluateHealth,
  mergeUpstreams,
  parsePrefix,
  percent,
  ripeTime,
  summarizeRoutes,
} from "../../lib/features/asn.js";
import {
  abuseContacts,
  announcedPrefixes,
  asNames,
  asOverview,
  lookingGlass,
  neighbours,
  networkState,
  peeringDbFacilities,
  peeringDbIxs,
  peeringDbNet,
  prefixState,
  registeredCountry,
  routingStatus,
  rpkiObjects,
  rpkiValidation,
} from "../../lib/services/asn.js";

const ASN = NETWORK_ASN;

const LINKS = [
  `[Website](${NETWORK_SITE_URL})`,
  `[bgp.tools](https://bgp.tools/as/${ASN})`,
  `[PeeringDB](https://www.peeringdb.com/asn/${ASN})`,
  `[RIPEstat](https://stat.ripe.net/AS${ASN})`,
].join(" · ");

/** Only show third-party URLs that are plain https, and keep them from breaking markdown links. */
function httpsUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString().replaceAll(")", "%29").replaceAll("(", "%28");
  } catch {
    return null;
  }
}

/** "AS209735 Lagrange Cloud…" with the holder name escaped and trimmed. */
function asLabel(asn: number, names: Map<number, string | null>, max = 40): string {
  const name = names.get(asn);
  return name ? `**AS${asn}** ${escapeMarkdown(truncate(name, max))}` : `**AS${asn}**`;
}

const text = (v: string | null | undefined, fallback = "—") => (v?.trim() ? escapeMarkdown(truncate(v.trim(), 200)) : fallback);

const SPEED = (mbps: number) => (mbps >= 1000 ? `${mbps / 1000}G` : `${mbps}M`);

export class As202902Command extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "as202902",
      description: `Live routing details for AS${ASN}, the Antares Network`,
      preconditions: ["BotChannel"],
      cooldownDelay: 10_000,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registerGuildCommand(this, registry, (b) =>
      b
        .addSubcommand((s) => s.setName("overview").setDescription("Who we are, visibility and announced space"))
        .addSubcommand((s) => s.setName("prefixes").setDescription("Announced prefixes with RPKI and visibility"))
        .addSubcommand((s) => s.setName("upstreams").setDescription("Upstream networks we're reachable through"))
        .addSubcommand((s) =>
          s
            .setName("routes")
            .setDescription("How the internet reaches a prefix (RIPE RIS looking glass)")
            .addStringOption((o) =>
              o.setName("prefix").setDescription("One of our prefixes (default: the first one)").setMaxLength(49),
            ),
        )
        .addSubcommand((s) => s.setName("peering").setDescription("Peering policy, IXs and facilities from PeeringDB"))
        .addSubcommand((s) => s.setName("rpki").setDescription("ROAs and route origin validation for our prefixes"))
        .addSubcommand((s) => s.setName("aspa").setDescription("ASPA: authorised upstream providers vs. what the internet actually sees"))
        .addSubcommand((s) => s.setName("health").setDescription("Routing health checks: visibility, RPKI, hijacks, redundancy")),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand(true);
    await interaction.deferReply();
    const embed = brandEmbed(interaction.client).setURL(NETWORK_SITE_URL);

    switch (sub) {
      case "overview": {
        const [overview, status, country, pdb, prefixes] = await Promise.all([
          asOverview(ASN),
          routingStatus(ASN),
          registeredCountry(ASN).catch(() => null),
          peeringDbNet(ASN).catch(() => null),
          announcedPrefixes(ASN),
        ]);
        const { v4, v6 } = status.visibility;
        const space = [
          status.announced_space.v4.prefixes
            ? `${status.announced_space.v4.prefixes} IPv4 (${status.announced_space.v4.ips.toLocaleString("en-US")} addresses)`
            : null,
          status.announced_space.v6.prefixes
            ? `${status.announced_space.v6.prefixes} IPv6 (${status.announced_space.v6["48s"].toLocaleString("en-US")} × /48)`
            : null,
        ].filter(Boolean);
        const firstSeen = ripeTime(status.first_seen?.time);

        embed
          .setTitle(`AS${ASN} · ${text(pdb?.name ?? overview.holder, `AS${ASN}`)}`)
          .setDescription(truncate(prefixes.map((p) => `\`${p}\``).join(" ") || "No prefixes visible right now", 1000))
          .addFields(
            { name: "Holder (RIPE)", value: text(overview.holder), inline: true },
            { name: "Registered in", value: text(country), inline: true },
            { name: "Status", value: overview.announced ? "🟢 Announced" : "🔴 Not announced", inline: true },
            { name: "IPv6 visibility", value: `${v6.ris_peers_seeing}/${v6.total_ris_peers} RIS peers (${percent(v6.ris_peers_seeing, v6.total_ris_peers)})`, inline: true },
            {
              name: "IPv4 visibility",
              value: v4.ris_peers_seeing ? `${v4.ris_peers_seeing}/${v4.total_ris_peers} RIS peers (${percent(v4.ris_peers_seeing, v4.total_ris_peers)})` : "Not announcing IPv4",
              inline: true,
            },
            { name: "Neighbours", value: String(status.observed_neighbours), inline: true },
            { name: "Announced space", value: space.join("\n") || "None", inline: true },
            { name: "First seen", value: firstSeen ? time(firstSeen, "D") : "—", inline: true },
            { name: "Type", value: text(pdb?.info_type), inline: true },
            { name: "Links", value: LINKS },
          );
        break;
      }

      case "prefixes": {
        const prefixes = await announcedPrefixes(ASN);
        if (!prefixes.length) throw new UserError({ identifier: "NoPrefixes", message: `AS${ASN} has no prefixes visible right now.` });
        const states = await Promise.all(prefixes.slice(0, 10).map((p) => prefixState(ASN, p)));
        embed.setTitle(`AS${ASN} · Announced prefixes (${prefixes.length})`).setDescription(
          truncate(
            states
              .map((s) => {
                const rpki = s.rpki === "valid" ? "✅ RPKI valid" : `⚠️ RPKI ${s.rpki}`;
                const vis = `${percent(s.visibility.seeing, s.visibility.total)} visible (${s.visibility.seeing}/${s.visibility.total})`;
                const foreign = s.origins.filter((o) => o !== ASN);
                const origin = foreign.length ? `\n⚠️ Also originated by ${foreign.map((o) => `AS${o}`).join(", ")}` : "";
                return `**\`${s.prefix}\`**\n${rpki} · ${vis}${origin}`;
              })
              .join("\n\n"),
            4000,
          ),
        );
        break;
      }

      case "upstreams": {
        const all = await neighbours(ASN);
        const left = all.filter((n) => n.type === "left");
        const downstream = all.filter((n) => n.type === "right").length;
        const names = await asNames(left.map((n) => n.asn));
        embed
          .setTitle(`AS${ASN} · Upstreams (${left.length})`)
          .setDescription(
            truncate(
              left
                .map((n) => {
                  const seen = [n.v6_peers && `${n.v6_peers} IPv6`, n.v4_peers && `${n.v4_peers} IPv4`].filter(Boolean).join(" / ");
                  return `${asLabel(n.asn, names)}\nSeen on paths by ${seen || "0"} RIS peers · [bgp.tools](https://bgp.tools/as/${n.asn})`;
                })
                .join("\n\n") || "No upstreams seen right now.",
              4000,
            ),
          )
          .addFields({ name: "Downstream networks", value: String(downstream), inline: true });
        break;
      }

      case "routes": {
        const prefixes = await announcedPrefixes(ASN);
        const raw = interaction.options.getString("prefix");
        const prefix = raw ? parsePrefix(raw) : prefixes[0];
        if (!prefix || !prefixes.includes(prefix)) {
          throw new UserError({
            identifier: "UnknownPrefix",
            message: prefixes.length
              ? `Pick one of AS${ASN}'s prefixes: ${prefixes.map((p) => `\`${p}\``).join(", ")}`
              : `AS${ASN} has no prefixes visible right now.`,
          });
        }
        const r = summarizeRoutes(await lookingGlass(prefix), ASN);
        const names = await asNames([...r.upstreams.slice(0, 5), ...r.transits.slice(0, 5)].map((x) => x.asn));
        const upstreamTotal = r.upstreams.reduce((a, u) => a + u.peers, 0);
        embed
          .setTitle(`Routes to ${prefix}`)
          .setDescription(`Seen by **${r.peers}** RIS peers at **${r.collectors}** collectors, over **${r.uniquePaths}** distinct AS paths.`)
          .addFields(
            {
              name: "AS path length",
              value: r.uniquePaths ? `min ${r.minLength} · avg ${r.avgLength.toFixed(1)} · max ${r.maxLength}` : "—",
              inline: true,
            },
            {
              name: `Entry into AS${ASN}`,
              value: truncate(r.upstreams.slice(0, 5).map((u) => `${asLabel(u.asn, names, 30)}: ${percent(u.peers, upstreamTotal)}`).join("\n") || "—", 1024),
            },
            {
              name: "Most-used transit networks",
              value: truncate(r.transits.slice(0, 5).map((t) => `${asLabel(t.asn, names, 30)}: ${t.peers} paths`).join("\n") || "—", 1024),
            },
            {
              name: "Shortest paths",
              value: r.samplePaths.length ? `\`\`\`\n${r.samplePaths.map((p) => p.join(" → ")).join("\n")}\n\`\`\`` : "—",
            },
          );
        if (r.otherOrigins.length) {
          embed.addFields({ name: "⚠️ Other origins seen", value: r.otherOrigins.map((o) => `AS${o}`).join(", ") });
        }
        break;
      }

      case "peering": {
        const net = await peeringDbNet(ASN);
        if (!net) throw new UserError({ identifier: "NoPeeringDb", message: `AS${ASN} has no PeeringDB record.` });
        // A PeeringDB cache may not serve every endpoint: show what we can rather than failing.
        const [ixs, facs, abuse] = await Promise.all([
          peeringDbIxs(net.id).catch(() => null),
          peeringDbFacilities(net.id).catch(() => null),
          abuseContacts(ASN).catch(() => []),
        ]);
        const policyUrl = httpsUrl(net.policy_url);
        const dashboard = httpsUrl(net.status_dashboard);
        const lg = httpsUrl(net.looking_glass);
        const updated = net.updated ? new Date(net.updated) : null;

        embed.setTitle(`AS${ASN} · Peering`).addFields(
          { name: "Policy", value: policyUrl ? `[${text(net.policy_general)}](${policyUrl})` : text(net.policy_general), inline: true },
          { name: "Contracts", value: text(net.policy_contracts), inline: true },
          { name: "IRR as-set", value: net.irr_as_set ? `\`${text(net.irr_as_set)}\`` : "—", inline: true },
          { name: "Traffic", value: text(net.info_traffic), inline: true },
          { name: "Ratio", value: text(net.info_ratio), inline: true },
          { name: "Scope", value: text(net.info_scope), inline: true },
          {
            name: ixs ? `Internet exchanges (${ixs.length})` : "Internet exchanges",
            value: ixs
              ? truncate(
                  ixs
                    .slice(0, 10)
                    .map((ix) => `**${text(ix.name)}** ${SPEED(ix.speed)}${ix.is_rs_peer ? " · route servers" : ""}`)
                    .join("\n") || "Not at any IX yet",
                  1024,
                )
              : "Unavailable right now",
          },
          {
            name: facs ? `Facilities (${facs.length})` : "Facilities",
            value: facs
              ? truncate(facs.slice(0, 10).map((f) => `${text(f.name)} (${text(f.city, "?")}, ${text(f.country, "?")})`).join("\n") || "None listed", 1024)
              : "Unavailable right now",
          },
          { name: "Abuse contact", value: abuse.length ? abuse.map((a) => escapeMarkdown(a)).join(", ") : "—", inline: true },
          {
            name: "Tools",
            value: [dashboard && `[Status](${dashboard})`, lg && `[Looking glass](${lg})`, `[PeeringDB](https://www.peeringdb.com/net/${net.id})`]
              .filter(Boolean)
              .join(" · "),
            inline: true,
          },
        );
        if (updated && !Number.isNaN(updated.getTime())) embed.addFields({ name: "PeeringDB updated", value: time(updated, "R"), inline: true });
        break;
      }

      case "rpki": {
        const [objects, prefixes] = await Promise.all([rpkiObjects(ASN), announcedPrefixes(ASN)]);
        const shown = prefixes.slice(0, 10);
        const validations = await Promise.all(shown.map((p) => rpkiValidation(ASN, p)));
        const { roas, uncovered } = analyzeRoas(objects.roas, prefixes);

        const rov = shown.map((p, i) => {
          const status = validations[i]?.status ?? "unknown";
          return `${status === "valid" ? "✅" : "⚠️"} \`${p}\` ${status}`;
        });
        const roaLines = roas.slice(0, 15).map(({ roa, covers, loose }) => {
          const notes = [
            covers.length ? null : "◽ not announced",
            loose ? `⚠️ maxLength /${roa.maxLength} is longer than anything announced (RFC 9319)` : null,
          ].filter(Boolean);
          return `\`${roa.prefix}\` max /${roa.maxLength} · ${escapeMarkdown(roa.ta)}${notes.length ? `\n${notes.join(" · ")}` : ""}`;
        });

        embed
          .setTitle(`AS${ASN} · RPKI`)
          .setDescription(
            `Validated by Routinator via RIPEstat${objects.generated ? `, data from ${time(objects.generated, "R")}` : ""}.`,
          )
          .addFields(
            { name: "Route origin validation", value: truncate(rov.join("\n") || "No prefixes announced", 1024) },
            { name: `ROAs (${objects.roas.length})`, value: truncate(roaLines.join("\n") || "⚠️ No ROAs published", 1024) },
          );
        if (uncovered.length) {
          embed.addFields({ name: "⚠️ Announced without a ROA", value: truncate(uncovered.map((p) => `\`${p}\``).join(", "), 1024) });
        }
        embed.addFields(
          {
            name: "ASPA",
            value: objects.aspaProviders ? `Published, ${objects.aspaProviders.length} provider(s). See \`/as202902 aspa\`` : "Not published",
            inline: true,
          },
          { name: "BGPsec router keys", value: String(objects.routerKeys), inline: true },
        );
        break;
      }

      case "aspa": {
        const [objects, prefixes] = await Promise.all([rpkiObjects(ASN), announcedPrefixes(ASN)]);
        if (!objects.aspaProviders) {
          embed
            .setTitle(`AS${ASN} · ASPA`)
            .setDescription(
              `⚠️ AS${ASN} has no ASPA object. Publishing one lists the upstream providers allowed to carry its routes, so route leaks through anyone else get rejected by ASPA-validating networks.`,
            );
          break;
        }
        const glasses = await Promise.all(prefixes.slice(0, 3).map((p) => lookingGlass(p)));
        const upstreams = mergeUpstreams(glasses.map((g) => summarizeRoutes(g, ASN).upstreams));
        const a = analyzeAspa(objects.aspaProviders, upstreams);
        const involved = [...new Set([...a.providers, ...a.unlisted])].slice(0, 10);
        const [names, theirAspa] = await Promise.all([
          asNames(involved),
          Promise.all(
            involved.map((asn) =>
              rpkiObjects(asn).then(
                (o) => o.aspaProviders !== null,
                () => null,
              ),
            ),
          ),
        ]);
        const publishes = new Map(involved.map((asn, i) => [asn, theirAspa[i] ?? null]));
        const own = (asn: number) => (publishes.get(asn) ? " · has own ASPA" : "");
        const peersOf = new Map(a.observed.map((o) => [o.asn, o.peers]));

        const providerLines = a.providers.map((p) => {
          const peers = peersOf.get(p);
          return peers
            ? `✅ ${asLabel(p, names, 32)}: ${percent(peers, a.pathsChecked)} of paths${own(p)}`
            : `◽ ${asLabel(p, names, 32)}: not seen on paths now${own(p)}`;
        });
        const adopters = involved.filter((asn) => publishes.get(asn)).length;
        const known = involved.filter((asn) => publishes.get(asn) !== null).length;

        embed
          .setTitle(`AS${ASN} · ASPA`)
          .setDescription(
            `AS${ASN}'s ASPA (${escapeMarkdown(objects.aspaTrustAnchor ?? "?")} trust anchor) authorises **${a.providers.length}** providers. ` +
              `Networks doing ASPA validation reject routes that enter AS${ASN} through anyone else.`,
          )
          .addFields({ name: "Authorised providers", value: truncate(providerLines.join("\n") || "None", 1024) });
        if (a.unlisted.length) {
          embed.addFields({
            name: "⚠️ Seen upstream but not authorised",
            value: truncate(a.unlisted.map((u) => `${asLabel(u, names, 32)}: ${peersOf.get(u) ?? 0} paths`).join("\n"), 1024),
          });
        }
        embed.addFields(
          {
            name: "Paths entering via an authorised provider",
            value: a.pathsChecked ? `${a.pathsAuthorised}/${a.pathsChecked} (${percent(a.pathsAuthorised, a.pathsChecked)})` : "No paths seen",
            inline: true,
          },
          {
            name: "Providers with their own ASPA",
            value: known ? `${adopters}/${known}` : "Unknown",
            inline: true,
          },
          {
            name: "Scope",
            value: `This checks the hop into AS${ASN} only. Verifying a full path also needs an ASPA from every AS on it.`,
          },
        );
        break;
      }

      case "health": {
        const checks = evaluateHealth(await networkState(ASN));
        const failing = checks.filter((c) => !c.ok).length;
        embed
          .setTitle(failing ? `⚠️ AS${ASN} · ${failing} check(s) need attention` : `✅ AS${ASN} · All checks passing`)
          .setDescription(truncate(checks.map((c) => `${c.ok ? "✅" : "⚠️"} **${c.label}**: ${c.detail}`).join("\n"), 4000))
          .addFields({ name: "Source", value: "RIPE RIS collectors + RPKI (Routinator), via RIPEstat" });
        break;
      }

      default:
        return;
    }

    await interaction.editReply({ embeds: [embed], components: [networkLinkRow()], allowedMentions: { parse: [] } });
  }
}
