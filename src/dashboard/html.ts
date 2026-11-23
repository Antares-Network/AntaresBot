/**
 * Minimal, auto-escaping HTML templating. Every interpolated value is escaped unless it is
 * a SafeHtml produced by this module, so user/Discord-controlled strings (server names,
 * usernames, audit details) can never inject markup.
 */
export class SafeHtml {
  public constructor(public readonly value: string) {}
  public toString() {
    return this.value;
  }
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };

export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"'`]/g, (c) => ESCAPES[c] ?? c);
}

type Interp = SafeHtml | string | number | boolean | null | undefined | readonly Interp[];

function render(v: Interp): string {
  if (v === null || v === undefined || v === false) return "";
  if (v instanceof SafeHtml) return v.value;
  if (Array.isArray(v)) return v.map((x: Interp) => render(x)).join("");
  return escapeHtml(v);
}

export function html(strings: TemplateStringsArray, ...values: Interp[]): SafeHtml {
  let out = strings[0] ?? "";
  values.forEach((v, i) => {
    out += render(v) + (strings[i + 1] ?? "");
  });
  return new SafeHtml(out);
}

export const STYLE = `
:root{--bg:#0f1115;--card:#171a21;--fg:#e8eaf0;--muted:#9aa3b2;--accent:#ff3505;--border:#2a2f3a;--ok:#2ecc71;--bad:#e74c3c}
@media (prefers-color-scheme: light){:root{--bg:#f5f6f8;--card:#fff;--fg:#1b1f27;--muted:#5b6475;--border:#dde1e8}}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--fg)}
header{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid var(--border);background:var(--card)}
header a{color:var(--fg);text-decoration:none;font-weight:600}main{max-width:960px;margin:0 auto;padding:20px 16px}
.card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px 18px;margin:0 0 16px}
h1{font-size:1.4rem;margin:0 0 12px}h2{font-size:1.1rem;margin:0 0 10px}.muted{color:var(--muted)}
label{display:block;margin:8px 0 4px;font-weight:500}input[type=text],input[type=number],select,textarea{width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--fg);font:inherit}
textarea{min-height:70px}.check{display:flex;gap:8px;align-items:center;font-weight:400}.check input{width:auto}
button,.btn{display:inline-block;margin-top:12px;padding:8px 14px;border:0;border-radius:6px;background:var(--accent);color:#fff;font:inherit;font-weight:600;cursor:pointer;text-decoration:none}
.btn.secondary,button.secondary{background:var(--border);color:var(--fg)}table{width:100%;border-collapse:collapse}td,th{padding:6px 8px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}.flash{padding:10px 14px;border-radius:8px;margin-bottom:16px}
.flash.ok{background:color-mix(in srgb,var(--ok) 18%,transparent)}.flash.bad{background:color-mix(in srgb,var(--bad) 18%,transparent)}
.row{display:flex;gap:12px;flex-wrap:wrap}.row>*{flex:1 1 200px}code{background:var(--bg);padding:1px 5px;border-radius:4px}
`;

export function layout(opts: { title: string; user?: { username: string } | null; flash?: { ok: boolean; text: string } | null; body: SafeHtml }) {
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="same-origin">
<title>${opts.title} · Antares Bot</title>
<link rel="stylesheet" href="/static/style.css">
</head>
<body>
<header><a href="/">Antares Bot</a>${opts.user ? html`<span class="muted">${opts.user.username} · <a href="/">Servers</a></span>` : ""}</header>
<main>
${opts.flash ? html`<div class="flash ${opts.flash.ok ? "ok" : "bad"}">${opts.flash.text}</div>` : ""}
${opts.body}
</main>
</body>
</html>`;
}
