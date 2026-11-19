/**
 * Minecraft Java "Server List Ping" protocol, pure encode/decode (no sockets), unit-tested.
 * https://minecraft.wiki/w/Java_Edition_protocol/Server_List_Ping
 */
import { BlockList, isIP } from "node:net";
import { z } from "zod";

export const DEFAULT_MC_PORT = 25565;
const HOST = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*\.?$/;

/** "host" or "host:port" -> parts; null if invalid. IPv6 literals aren't accepted. */
export function parseAddress(input: string): { host: string; port: number | null } | null {
  const m = /^([^:\s]+)(?::(\d{1,5}))?$/.exec(input.trim());
  if (!m?.[1]) return null;
  const host = m[1].toLowerCase().replace(/\.$/, "");
  if (!HOST.test(host) && isIP(host) !== 4) return null;
  if (m[2] === undefined) return { host, port: null };
  const port = Number(m[2]);
  return port >= 1 && port <= 65535 ? { host, port } : null;
}

export function isValidHostname(host: string): boolean {
  return HOST.test(host);
}

// Addresses the bot must never be pointed at by an ordinary user (SSRF protection):
// loopback, private LANs, link-local, CGNAT, multicast, reserved, and their IPv6 forms.
const blocked = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net, bits, "ipv4");
}
for (const [net, bits] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
  ["64:ff9b::", 96],
] as const) {
  blocked.addSubnet(net, bits, "ipv6");
}

export function isPublicIp(ip: string): boolean {
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) is judged by its IPv4 address. (A ::ffff:0:0/96 BlockList
  // rule can't be used: Node applies it to every plain IPv4 address too.)
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped?.[1]) return isPublicIp(mapped[1]);
  const family = isIP(ip);
  if (family === 4) return !blocked.check(ip, "ipv4");
  if (family === 6) return !blocked.check(ip, "ipv6");
  return false;
}

export function encodeVarInt(value: number): Buffer {
  const bytes: number[] = [];
  let v = value >>> 0;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v !== 0) b |= 0x80;
    bytes.push(b);
  } while (v !== 0);
  return Buffer.from(bytes);
}

/** Read a VarInt at `offset`. Returns null if the buffer doesn't hold a complete one yet. */
export function readVarInt(buf: Buffer, offset = 0): { value: number; size: number } | null {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    if (offset + i >= buf.length) return null;
    const b = buf[offset + i] as number;
    value |= (b & 0x7f) << (7 * i);
    if ((b & 0x80) === 0) return { value: value | 0, size: i + 1 };
  }
  throw new Error("VarInt too long");
}

const packet = (id: number, ...fields: Buffer[]) => {
  const body = Buffer.concat([encodeVarInt(id), ...fields]);
  return Buffer.concat([encodeVarInt(body.length), body]);
};

/** Handshake (next state = status) followed by the status request. */
export function statusRequest(host: string, port: number): Buffer {
  const hostBuf = Buffer.from(host, "utf8");
  const portBuf = Buffer.alloc(2);
  portBuf.writeUInt16BE(port);
  return Buffer.concat([packet(0x00, encodeVarInt(767), encodeVarInt(hostBuf.length), hostBuf, portBuf, encodeVarInt(1)), packet(0x00)]);
}

/**
 * Try to read the status response from the bytes received so far.
 * Returns the JSON string, or null if more data is needed. Throws on garbage.
 */
export function readStatusResponse(buf: Buffer, maxBytes = 64 * 1024): string | null {
  const len = readVarInt(buf, 0);
  if (!len) return null;
  if (len.value <= 0 || len.value > maxBytes) throw new Error("bad packet length");
  if (buf.length < len.size + len.value) return null;
  let off = len.size;
  const id = readVarInt(buf, off);
  if (id?.value !== 0x00) throw new Error("unexpected packet");
  off += id.size;
  const strLen = readVarInt(buf, off);
  if (!strLen || strLen.value < 0) throw new Error("bad string");
  off += strLen.size;
  if (off + strLen.value > len.size + len.value) throw new Error("bad string length");
  return buf.subarray(off, off + strLen.value).toString("utf8");
}

const Chat: z.ZodType = z.lazy(() =>
  z.union([z.string(), z.object({ text: z.string().optional(), extra: z.array(Chat).optional() }).loose()]),
);

const Status = z
  .object({
    version: z
      .object({ name: z.string().max(200).optional(), protocol: z.number().optional() })
      .loose()
      .optional(),
    players: z
      .object({
        online: z.number().int().min(0).max(10_000_000),
        max: z.number().int().min(0).max(10_000_000),
        sample: z
          .array(z.object({ name: z.string(), id: z.string().optional() }).loose())
          .max(200)
          .optional(),
      })
      .loose()
      .optional(),
    description: Chat.optional(),
  })
  .loose();

/** Plain text from a chat component, with § formatting codes removed. */
export function flattenChat(c: unknown, depth = 0): string {
  if (depth > 10) return "";
  if (typeof c === "string") return c.replace(/§./g, "");
  if (c && typeof c === "object") {
    const o = c as { text?: unknown; extra?: unknown };
    const own = typeof o.text === "string" ? o.text : "";
    const extra = Array.isArray(o.extra) ? o.extra.map((e) => flattenChat(e, depth + 1)).join("") : "";
    return (own + extra).replace(/§./g, "");
  }
  return "";
}

export interface McStatus {
  online: number;
  max: number;
  version: string;
  motd: string;
  /** Sample of online player names (servers show at most ~12; names validated). */
  players: string[];
}

const PLAYER_NAME = /^[A-Za-z0-9_]{1,16}$/;

export function parseStatus(json: string): McStatus {
  const data = Status.parse(JSON.parse(json));
  return {
    online: data.players?.online ?? 0,
    max: data.players?.max ?? 0,
    version: (data.version?.name ?? "").replace(/§./g, "").slice(0, 60),
    motd: flattenChat(data.description).replace(/\s+/g, " ").trim().slice(0, 200),
    // Servers often put fake "names" (ads, colour codes) in the sample: keep real usernames only.
    players: (data.players?.sample ?? [])
      .map((p) => p.name)
      .filter((n) => PLAYER_NAME.test(n))
      .slice(0, 20),
  };
}
