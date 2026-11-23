import { createCache } from "../lib/cache.js";
import { createRateLimiter } from "../lib/rateLimit.js";

/** Server logs get a short message with the API key (if it ever appeared) redacted. */
export function redact(message) {
  const key = process.env.GEMINI_API_KEY;
  const text = String(message || "").slice(0, 160);
  return key ? text.split(key).join("[redacted]") : text;
}

const json = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

/**
 * Shared handler for the API routes, so both get identical protection: rate limit, body-size
 * cap, validation, optional response cache, and error messages that never leak internals.
 * @param {{ name: string, validate: (body: unknown) => { ok: boolean, errors: object, value: object | null }, run: (value: object) => Promise<object>, limit?: number, windowMs?: number, useCache?: boolean, cacheMax?: number, ttlMs?: number, maxBodyBytes?: number }} options
 * @returns {(request: Request) => Promise<Response>}
 */
export function createApiHandler({
  name,
  validate,
  run,
  limit = 10,
  windowMs = 60000,
  useCache = true,
  cacheMax = 50,
  ttlMs = 600000,
  maxBodyBytes = 8192,
}) {
  const limiter = createRateLimiter({ limit, windowMs });
  const cache = createCache({ max: cacheMax, ttlMs });

  return async function POST(request) {
    try {
      const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anonymous";
      const rate = limiter.check(ip);
      if (!rate.allowed) {
        return json({ error: "Too many requests. Please wait a moment and try again." }, 429, {
          "Retry-After": String(rate.retryAfterSec),
        });
      }

      const declared = Number(request.headers.get("content-length") || 0);
      if (declared > maxBodyBytes) return json({ error: "That request is too large." }, 413);
      const text = await request.text();
      if (text.length > maxBodyBytes) return json({ error: "That request is too large." }, 413);

      let body;
      try {
        body = JSON.parse(text);
      } catch {
        return json({ error: "The request wasn't valid JSON." }, 400);
      }

      const checked = validate(body);
      if (!checked.ok) {
        const message = Object.values(checked.errors)[0] || "Please check your inputs.";
        return json({ error: message, fields: checked.errors }, 400);
      }

      const key = JSON.stringify(checked.value);
      if (useCache) {
        const hit = cache.get(key);
        if (hit) return json({ ...hit, cached: true });
      }

      const result = await run(checked.value);
      if (useCache) cache.set(key, result);
      return json(result);
    } catch (error) {
      console.error(
        `[${name}]`,
        redact(error && error.message),
        error && error.details ? `| reason: ${redact(error.details)}` : "",
      );
      const exposed = error && error.expose === true;
      return json(
        { error: exposed ? error.message : "Something went wrong. Please try again." },
        exposed && error.status ? error.status : 500,
      );
    }
  };
}
