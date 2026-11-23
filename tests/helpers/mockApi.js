import { normalizeAirResponse } from "../../lib/air.js";
import { jsonResponse, makeLiveAirJson } from "./fixtures.js";

export const DELHI = { name: "Delhi", label: "Delhi", lat: 28.65, lon: 77.23 };

/** The body /api/air returns, built from a response whose dates follow the real clock. */
export const airBody = (aqi = 288) => ({
  place: DELHI,
  air: normalizeAirResponse(makeLiveAirJson(aqi), Date.now()),
});

export const narrationBody = (overrides = {}) => ({
  narration: {
    headline: "Stay in today and keep the windows shut.",
    answer: "Better after sunset, and only briefly.",
    actions: [{ id: "seal", explanation: "Keep the windows shut through the smoggy hours." }],
    ...overrides,
  },
  basedOn: { usAqi: 288, dataTime: "2026-11-22T08:00" },
  language: "en",
});

/**
 * Replaces fetch with a router for this app's two routes. Each handler may be a ready
 * response or a function of the parsed request body.
 */
export function mockApi({
  air = jsonResponse(airBody()),
  advice = jsonResponse(narrationBody()),
} = {}) {
  global.fetch = jest.fn(async (url, init) => {
    const handler = url === "/api/air" ? air : url === "/api/advice" ? advice : null;
    if (!handler) throw new Error(`Unexpected request to ${url}`);
    return typeof handler === "function" ? handler(JSON.parse(init.body)) : handler;
  });
  return global.fetch;
}

/** The parsed body of the first call to a route. */
export function bodyOf(fetchMock, url) {
  const call = fetchMock.mock.calls.find(([target]) => target === url);
  return call ? JSON.parse(call[1].body) : undefined;
}
