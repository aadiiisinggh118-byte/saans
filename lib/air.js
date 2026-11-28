import { DATA_SOURCE } from "./constants.js";
import { ServiceError } from "./errors.js";
import { parseLocalIst } from "./time.js";

const finite = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);

const noReading = () =>
  new ServiceError(
    "The air-quality service has no reading for this place right now. Please try again shortly.",
  );

/**
 * @typedef {object} AirReport
 * @property {number} usAqi current US AQI
 * @property {number | null} pm25 µg/m³
 * @property {number | null} pm10 µg/m³
 * @property {number | null} no2
 * @property {number | null} o3
 * @property {string} dataTime local IST timestamp the reading applies to
 * @property {number} dataTimeMs the same moment as epoch milliseconds
 * @property {{ time: string, timeMs: number, usAqi: number | null, pm25: number | null }[]} hourly
 * @property {string} fetchedAt ISO time the server fetched this
 * @property {typeof DATA_SOURCE} source
 */

/**
 * @typedef {object} OpenMeteoAirBody the parts of an Open-Meteo air-quality response we read;
 *   every value is untrusted until it has been checked
 * @property {{ time?: string, us_aqi?: unknown, pm2_5?: unknown, pm10?: unknown, nitrogen_dioxide?: unknown, ozone?: unknown }} [current]
 * @property {{ time?: unknown, us_aqi?: unknown, pm2_5?: unknown }} [hourly]
 */

/**
 * Turns an Open-Meteo air-quality response into the app's own shape. Nothing here is
 * invented: a missing reading is an error, never a default.
 * @param {unknown} json parsed response body
 * @param {number} fetchedAtMs when the response was received
 * @returns {AirReport}
 */
export function normalizeAirResponse(json, fetchedAtMs) {
  const body = /** @type {OpenMeteoAirBody} */ (json && typeof json === "object" ? json : {});
  const current = body.current;
  if (!current || typeof current !== "object") throw noReading();
  const dataTimeMs = parseLocalIst(current.time);
  if (dataTimeMs === null) throw noReading();

  const times = Array.isArray(body.hourly?.time) ? body.hourly.time : [];
  const aqi = Array.isArray(body.hourly?.us_aqi) ? body.hourly.us_aqi : [];
  const pm = Array.isArray(body.hourly?.pm2_5) ? body.hourly.pm2_5 : [];
  const hourly = [];
  times.forEach((time, i) => {
    const timeMs = parseLocalIst(time);
    if (timeMs !== null) hourly.push({ time, timeMs, usAqi: finite(aqi[i]), pm25: finite(pm[i]) });
  });

  let usAqi = finite(current.us_aqi);
  if (usAqi === null) usAqi = hourly.find((h) => h.timeMs === dataTimeMs)?.usAqi ?? null;
  if (usAqi === null) throw noReading();

  return {
    usAqi: Math.round(usAqi),
    pm25: finite(current.pm2_5),
    pm10: finite(current.pm10),
    no2: finite(current.nitrogen_dioxide),
    o3: finite(current.ozone),
    dataTime: current.time,
    dataTimeMs,
    hourly,
    fetchedAt: new Date(fetchedAtMs).toISOString(),
    source: DATA_SOURCE,
  };
}

/** Lower-cases and removes accents, so "Haryāna" and "Haryana" compare as the same place. */
function plainText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Picks the first Indian match from a geocoding response.
 * @param {unknown} json parsed response body
 * @returns {{ name: string, label: string, lat: number, lon: number } | null}
 */
export function normalizeGeocodeResponse(json) {
  const body = /** @type {{ results?: unknown }} */ (json && typeof json === "object" ? json : {});
  const results = Array.isArray(body.results) ? body.results : [];
  const hit = results.find(
    (r) =>
      r &&
      r.country_code === "IN" &&
      typeof r.name === "string" &&
      finite(r.latitude) !== null &&
      finite(r.longitude) !== null,
  );
  if (!hit) return null;
  const region = typeof hit.admin1 === "string" ? hit.admin1 : "";
  const sameAsName = plainText(region) === plainText(hit.name);
  return {
    name: hit.name,
    label: region && !sameAsName ? `${hit.name}, ${region}` : hit.name,
    lat: hit.latitude,
    lon: hit.longitude,
  };
}
