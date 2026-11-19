import { EmbedBuilder, type Client } from "discord.js";
import { z } from "zod";
import { BRAND_COLOR } from "../constants.js";
import { truncate } from "../embeds.js";
import { fetchJson, safeImageUrl } from "../http.js";

export type PreviewTarget = { kind: "xkcd"; num: number } | { kind: "github"; owner: string; repo: string };

const XKCD_RE = /https?:\/\/(?:www\.)?xkcd\.com\/(\d{1,5})\/?(?=[\s>)]|$)/gi;
// GitHub owner/repo naming rules; anything else is ignored.
const GITHUB_RE = /https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100})\/?(?=[\s>)#?]|$)/gi;

/** Find up to `max` previewable links (ignoring links wrapped in <> which Discord suppresses). */
export function findPreviewTargets(content: string, max = 2): PreviewTarget[] {
  const out: PreviewTarget[] = [];
  const seen = new Set<string>();
  const text = content.replace(/<https?:\/\/[^>]+>/g, "");
  for (const m of text.matchAll(XKCD_RE)) {
    const key = `xkcd:${m[1]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: "xkcd", num: Number(m[1]) });
  }
  for (const m of text.matchAll(GITHUB_RE)) {
    const repo = (m[2] ?? "").replace(/\.git$/, "");
    const key = `gh:${m[1]}/${repo}`.toLowerCase();
    if (!repo || seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: "github", owner: m[1] ?? "", repo });
  }
  return out.slice(0, max);
}

const cache = new Map<string, { embed: EmbedBuilder | null; at: number }>();
const TTL = 3_600_000;

const Xkcd = z.object({ num: z.number(), safe_title: z.string(), img: z.string(), alt: z.string() });
const Repo = z.object({
  full_name: z.string(),
  html_url: z.string(),
  description: z.string().nullable(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  open_issues_count: z.number(),
  language: z.string().nullable(),
  license: z.object({ spdx_id: z.string().nullable() }).nullable(),
  owner: z.object({ avatar_url: z.string() }),
});

async function build(t: PreviewTarget): Promise<EmbedBuilder | null> {
  if (t.kind === "xkcd") {
    const c = await fetchJson(`https://xkcd.com/${t.num}/info.0.json`, Xkcd);
    const img = safeImageUrl(c.img, ["xkcd.com"]);
    const e = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(truncate(`xkcd #${c.num}: ${c.safe_title}`, 256))
      .setURL(`https://xkcd.com/${c.num}/`)
      .setFooter({ text: truncate(c.alt, 2048) });
    if (img) e.setImage(img);
    return e;
  }
  const r = await fetchJson(
    `https://api.github.com/repos/${encodeURIComponent(t.owner)}/${encodeURIComponent(t.repo)}`,
    Repo,
  );
  const e = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(truncate(r.full_name, 256))
    .setURL(`https://github.com/${r.full_name}`)
    .setDescription(truncate(r.description ?? "No description.", 300))
    .addFields(
      { name: "⭐ Stars", value: r.stargazers_count.toLocaleString("en-US"), inline: true },
      { name: "🍴 Forks", value: r.forks_count.toLocaleString("en-US"), inline: true },
      { name: "Issues", value: r.open_issues_count.toLocaleString("en-US"), inline: true },
    );
  if (r.language) e.addFields({ name: "Language", value: r.language, inline: true });
  if (r.license?.spdx_id) e.addFields({ name: "License", value: r.license.spdx_id, inline: true });
  const avatar = safeImageUrl(r.owner.avatar_url, ["githubusercontent.com"]);
  if (avatar) e.setThumbnail(avatar);
  return e;
}

/** Embeds for the links in a message. Failures (404, rate limit) quietly produce nothing. */
export async function previewEmbeds(_client: Client, content: string): Promise<EmbedBuilder[]> {
  const out: EmbedBuilder[] = [];
  for (const t of findPreviewTargets(content)) {
    const key = t.kind === "xkcd" ? `xkcd:${t.num}` : `gh:${t.owner}/${t.repo}`.toLowerCase();
    const hit = cache.get(key);
    let embed: EmbedBuilder | null;
    if (hit && Date.now() - hit.at < TTL) embed = hit.embed;
    else {
      embed = await build(t).catch(() => null);
      cache.set(key, { embed, at: Date.now() });
      if (cache.size > 2000) cache.clear();
    }
    if (embed) out.push(embed);
  }
  return out;
}
