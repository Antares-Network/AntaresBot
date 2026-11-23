import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { html, layout } from "./html.js";
import { registerRoutes, type Deps } from "./routes.js";

/**
 * Build the app (separate from listen() so tests can use app.inject()).
 * `rateLimit: false` exists only for the local security-scan sandbox (scripts/dashboard-sandbox.mjs),
 * so a scanner's thousands of requests aren't all answered with 429. Production never passes it.
 */
export async function buildApp(deps: Deps, { rateLimit: limitRate = true }: { rateLimit?: boolean } = {}): Promise<FastifyInstance> {
  const { cfg } = deps;
  const app = Fastify({
    logger: { level: cfg.NODE_ENV === "test" ? "silent" : "info", redact: ["req.headers.cookie", "req.headers.authorization"] },
    trustProxy: cfg.DASHBOARD_TRUST_PROXY,
    bodyLimit: 64 * 1024,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "https://cdn.discordapp.com"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
      },
    },
    strictTransportSecurity: cfg.DASHBOARD_PUBLIC_URL.startsWith("https://") ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    referrerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
  });
  if (limitRate) await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(cookie, { secret: cfg.DASHBOARD_SESSION_SECRET });
  await app.register(formbody);
  // Every form posts application/x-www-form-urlencoded. Without this, Fastify's built-in JSON
  // parser would also accept JSON bodies, whose nested objects the form handlers don't expect.
  app.removeContentTypeParser("application/json");

  app.setErrorHandler((err: FastifyError, req, reply) => {
    req.log.error(err);
    const status = typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 500;
    // Never leak internals to the browser.
    void reply
      .code(status)
      .type("text/html; charset=utf-8")
      .send(layout({ title: "Error", body: html`<div class="card">${status === 429 ? "Slow down a little and try again." : "Something went wrong."} <a href="/">Home</a></div>` }).value);
  });

  registerRoutes(app, deps);
  return app;
}

