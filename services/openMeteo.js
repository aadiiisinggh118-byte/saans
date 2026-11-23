// The only module that talks to the air-quality and geocoding services. Both are Open-Meteo
// APIs, which need no key, so there is no secret to protect on this path.

import { normalizeAirResponse, normalizeGeocodeResponse } from "../lib/air.js";
import { ServiceError } from "../lib/errors.js";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const DEFAULT_TIMEOUT_MS = 8000;

const UNAVAILABLE =
  "We couldn't reach the air-quality service right now. Please try again in a minute.";

/**
 * @typedef {object} RequestOptions
 * @property {typeof fetch} fetchImpl
 * @property {number} [timeoutMs]
 * @property {() => number} [now]
 */

async function getJson(url, { fetchImpl, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ServiceError(UNAVAILABLE, 502, `HTTP ${response.status} from ${new URL(url).host}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    if (error && error.name === "AbortError") {
      throw new ServiceError(
        "The air-quality service took too long to answer. Please try again.",
        504,
      );
    }
    throw new ServiceError(UNAVAILABLE, 502, String(error && error.message));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Finds a place in India by name.
 * @param {string} query for example "Noida" or "Andheri, Mumbai"
 * @param {RequestOptions} options
 * @returns {Promise<{ name: string, label: string, lat: number, lon: number }>}
 */
export async function searchPlace(query, options) {
  const params = new URLSearchParams({
    name: query,
    count: "10",
    language: "en",
    format: "json",
    countryCode: "IN",
  });
  const place = normalizeGeocodeResponse(await getJson(`${GEOCODING_URL}?${params}`, options));
  if (!place) {
    throw new ServiceError(
      "We couldn't find that place in India. Try the name of a nearby city.",
      404,
    );
  }
  return place;
}

/**
 * Fetches the current reading and the next two days of hourly forecast.
 * @param {number} lat
 * @param {number} lon
 * @param {RequestOptions} options
 * @returns {Promise<import("../lib/air.js").AirReport>}
 */
export async function fetchAir(lat, lon, options) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone",
    hourly: "us_aqi,pm2_5",
    forecast_days: "2",
    timezone: "Asia/Kolkata",
  });
  const json = await getJson(`${AIR_QUALITY_URL}?${params}`, options);
  return normalizeAirResponse(json, (options.now ?? Date.now)());
}
