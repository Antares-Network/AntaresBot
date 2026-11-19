import { lookup, resolveSrv } from "node:dns/promises";
import { Socket } from "node:net";
import {
  DEFAULT_MC_PORT,
  isPublicIp,
  isValidHostname,
  parseAddress,
  parseStatus,
  readStatusResponse,
  statusRequest,
  type McStatus,
} from "../features/mcping.js";

export class McPingError extends Error {}

const TIMEOUT_MS = 5_000;

/**
 * Ping a Minecraft Java server. Resolves SRV records like the game does, then connects to a
 * resolved IP (not the name again, so DNS can't change between the check and the connect).
 * Unless `allowPrivate` (owner-configured status channels), only public IPs are allowed,
 * so members can't use the bot to probe the network it runs on.
 */
export async function pingMinecraft(
  address: string,
  { allowPrivate = false } = {},
): Promise<McStatus & { latencyMs: number; resolved: string }> {
  const parsed = parseAddress(address);
  if (!parsed) throw new McPingError("That isn't a valid server address.");
  let { host } = parsed;
  let port = parsed.port ?? DEFAULT_MC_PORT;

  if (parsed.port === null) {
    const srv = await resolveSrv(`_minecraft._tcp.${host}`).catch(() => []);
    const best = srv.sort((a, b) => a.priority - b.priority || b.weight - a.weight)[0];
    if (best && isValidHostname(best.name)) {
      host = best.name.toLowerCase().replace(/\.$/, "");
      port = best.port;
    }
  }

  const addrs = await lookup(host, { all: true }).catch(() => []);
  const usable = addrs.filter((a) => allowPrivate || isPublicIp(a.address));
  const target = usable.find((a) => a.family === 4) ?? usable[0];
  if (!target) {
    throw new McPingError(addrs.length ? "That address points to a private network, which isn't allowed." : "I couldn't find that server.");
  }

  const started = Date.now();
  const json = await new Promise<string>((resolve, reject) => {
    const socket = new Socket();
    let buf = Buffer.alloc(0);
    const fail = (msg: string) => {
      socket.destroy();
      reject(new McPingError(msg));
    };
    socket.setTimeout(TIMEOUT_MS, () => {
      fail("The server didn't answer in time.");
    });
    socket.once("error", () => {
      fail("The server is offline or not reachable.");
    });
    socket.on("data", (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      try {
        const res = readStatusResponse(buf);
        if (res !== null) {
          socket.destroy();
          resolve(res);
        }
      } catch {
        fail("That doesn't look like a Minecraft server.");
      }
    });
    socket.once("close", () => {
      fail("The server closed the connection.");
    });
    socket.connect({ host: target.address, port, family: target.family }, () => socket.write(statusRequest(parsed.host, port)));
  });

  try {
    return { ...parseStatus(json), latencyMs: Date.now() - started, resolved: `${host}:${port}` };
  } catch {
    throw new McPingError("That server sent a status I couldn't read.");
  }
}
