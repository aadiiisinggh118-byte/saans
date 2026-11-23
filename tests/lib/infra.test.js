import { createCache } from "../../lib/cache.js";
import { createRateLimiter } from "../../lib/rateLimit.js";
import { contrastRatio, meetsAA } from "../../lib/colorContrast.js";

describe("cache", () => {
  it("expires entries after the TTL", () => {
    let clock = 0;
    const cache = createCache({ ttlMs: 1000, now: () => clock });
    cache.set("a", 1);
    clock = 999;
    expect(cache.get("a")).toBe(1);
    clock = 1001;
    expect(cache.get("a")).toBeUndefined();
  });

  it("evicts the least recently used entry beyond its size", () => {
    const cache = createCache({ max: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a"); // a is now the most recent
    cache.set("c", 3);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    expect(cache.size).toBe(2);
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and says how long to wait", () => {
    const clock = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 60000, now: () => clock });
    expect(limiter.check("ip").allowed).toBe(true);
    expect(limiter.check("ip").allowed).toBe(true);
    const blocked = limiter.check("ip");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(60);
  });

  it("allows again once the window has passed, and keeps callers separate", () => {
    let clock = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => clock });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    clock = 1500;
    expect(limiter.check("a").allowed).toBe(true);
  });
});

describe("contrast maths", () => {
  it("matches the known extremes", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("applies the AA thresholds", () => {
    expect(meetsAA(4.5)).toBe(true);
    expect(meetsAA(4.4)).toBe(false);
    expect(meetsAA(3, "large")).toBe(true);
  });
});
