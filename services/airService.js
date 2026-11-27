import { createCache } from "../lib/cache.js";
import { fetchAir, searchPlace } from "./openMeteo.js";

/**
 * Resolves a place and its air-quality report, caching readings briefly so repeated checks
 * for the same area do not hit the upstream service (the data only changes hourly).
 * @param {{ fetchImpl?: typeof fetch, now?: () => number, ttlMs?: number, max?: number }} [options]
 */
export function createAirService({ fetchImpl, now = Date.now, ttlMs = 600000, max = 200 } = {}) {
  const cache = createCache({ max, ttlMs, now });
  // Resolve `fetch` at call time so tests (and the runtime) can replace it.
  const options = { fetchImpl: fetchImpl ?? ((url, init) => globalThis.fetch(url, init)), now };

  return {
    /**
     * @param {{ query?: string, lat?: number, lon?: number, name?: string }} request
     * @returns {Promise<{ place: { name: string, label: string, lat: number, lon: number }, air: import("../lib/air.js").AirReport }>}
     */
    async resolve(request) {
      const place =
        typeof request.query === "string"
          ? await searchPlace(request.query, options)
          : {
              name: request.name || "Your location",
              label: request.name || `${request.lat}, ${request.lon}`,
              lat: request.lat,
              lon: request.lon,
            };
      const key = `${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;
      let air = cache.get(key);
      if (!air) {
        air = await fetchAir(place.lat, place.lon, options);
        cache.set(key, air);
      }
      return { place, air };
    },
  };
}

/** The shared instance used by the API routes. */
export const airService = createAirService();
