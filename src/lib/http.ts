import type { z } from "zod";
import { VERSION } from "./constants.js";

const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_BODY_BYTES = 1_000_000;

export class HttpError extends Error {
  public constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Transient failures worth one retry: timeouts, network errors, 429 and 5xx. */
function isTransient(err: unknown): boolean {
  if (err instanceof HttpError) return err.status === 429 || (err.status !== undefined && err.status >= 500);
  return err instanceof TypeError || (err instanceof DOMException && err.name === "TimeoutError");
}

/**
 * GET a JSON endpoint with a hard timeout, a response-size cap, and schema validation.
 * Third-party APIs are untrusted input: anything that doesn't match `schema` is rejected.
 * Transient failures are retried once after a short pause.
 */
export async function fetchJson<T>(
  url: string | URL,
  schema: z.ZodType<T>,
  options: { timeoutMs?: number } = {},
): Promise<T> {
  try {
    return await fetchJsonOnce(url, schema, options);
  } catch (err) {
    if (!isTransient(err)) throw err;
    await new Promise((r) => setTimeout(r, 750));
    return fetchJsonOnce(url, schema, options);
  }
}

/**
 * Validate an image URL from a third-party API before embedding it: it must point at one
 * of that API's known hosts (or a subdomain). Plain http from a known host is upgraded to
 * https. Returns null if the URL should not be shown.
 */
export function safeImageUrl(raw: string, allowedHosts: readonly string[]): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!allowedHosts.some((h) => host === h || host.endsWith(`.${h}`))) return null;
  if (url.username || url.password) return null;
  if (url.protocol === "http:") url.protocol = "https:";
  if (url.protocol !== "https:" || (url.port && url.port !== "443")) return null;
  return url.toString();
}

async function fetchJsonOnce<T>(
  url: string | URL,
  schema: z.ZodType<T>,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<T> {
  const res = await fetch(url, {
    headers: { accept: "application/json", "user-agent": `AntaresBot/${VERSION}` },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
  });
  if (!res.ok || res.status === 204) {
    await res.body?.cancel();
    throw new HttpError(`GET ${new URL(url).host} returned HTTP ${res.status}`, res.status);
  }

  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    await res.body?.cancel();
    throw new HttpError("response too large");
  }
  const text = await readCapped(res, MAX_BODY_BYTES);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(`invalid JSON from ${new URL(url).host}`);
  }
  return schema.parse(body);
}

/**
 * Read a response body as UTF-8, aborting as soon as more than `maxBytes` have arrived.
 * Content-Length can be absent (chunked/compressed) or wrong, so count the actual bytes.
 */
export async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader: ReadableStreamDefaultReader<Uint8Array> = res.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new HttpError("response too large");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

/** POST JSON (used for bot-list stats and uptime pushes). Returns the status code. */
export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<number> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": `AntaresBot/${VERSION}`, ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });
  await res.body?.cancel();
  return res.status;
}
