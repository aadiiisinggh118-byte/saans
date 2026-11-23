import { INDIA_BOUNDS } from "./constants.js";
import { sanitizeProfile } from "./profile.js";

export const LANGUAGES = Object.freeze(["en", "hi"]);

/**
 * Trims, strips control characters and caps length.
 * @param {unknown} value
 * @param {number} [max]
 * @returns {string}
 */
export function cleanText(value, max = 80) {
  if (typeof value !== "string") return "";
  const printable = Array.from(value, (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? " " : ch;
  }).join("");
  return printable.replace(/\s+/g, " ").trim().slice(0, max);
}

const round2 = (n) => Math.round(n * 100) / 100;

function readCoordinates(r) {
  const lat = typeof r.lat === "number" ? r.lat : NaN;
  const lon = typeof r.lon === "number" ? r.lon : NaN;
  const inIndia =
    lat >= INDIA_BOUNDS.minLat &&
    lat <= INDIA_BOUNDS.maxLat &&
    lon >= INDIA_BOUNDS.minLon &&
    lon <= INDIA_BOUNDS.maxLon;
  return inIndia ? { lat: round2(lat), lon: round2(lon), name: cleanText(r.name) } : null;
}

/**
 * Request body for POST /api/air: a place name, or coordinates inside India.
 * @param {unknown} raw
 * @returns {{ ok: boolean, errors: Record<string, string>, value: object | null }}
 */
export function validateAirRequest(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const query = cleanText(r.query);
  if (query.length >= 2) return { ok: true, errors: {}, value: { query } };
  const coordinates = readCoordinates(r);
  if (coordinates) return { ok: true, errors: {}, value: coordinates };
  return {
    ok: false,
    errors: { location: "Enter a city or area in India, for example Noida." },
    value: null,
  };
}

/**
 * Request body for POST /api/advice. Coordinates are required, because the server
 * re-fetches the air reading itself and never trusts air values sent by the browser.
 * @param {unknown} raw
 * @returns {{ ok: boolean, errors: Record<string, string>, value: object | null }}
 */
export function validateAdviceRequest(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const coordinates = readCoordinates(r);
  if (!coordinates) {
    return {
      ok: false,
      errors: { location: "Check the air for a place in India first." },
      value: null,
    };
  }
  return {
    ok: true,
    errors: {},
    value: {
      ...coordinates,
      profile: sanitizeProfile(r.profile),
      language: LANGUAGES.includes(r.language) ? r.language : "en",
      question: cleanText(r.question, 200),
    },
  };
}
