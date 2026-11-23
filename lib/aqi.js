import { AQI_BANDS, STALE_AFTER_MINUTES } from "./constants.js";

/**
 * @param {number} aqi US AQI
 * @returns {number} index into AQI_BANDS, or -1 if the value is not a number
 */
export function bandIndexForAqi(aqi) {
  if (!Number.isFinite(aqi)) return -1;
  const value = Math.max(0, Math.round(aqi));
  const index = AQI_BANDS.findIndex((band) => value <= band.max);
  return index === -1 ? AQI_BANDS.length - 1 : index;
}

/**
 * @param {number} aqi US AQI
 * @returns {(typeof AQI_BANDS)[number] & { index: number } | null}
 */
export function bandForAqi(aqi) {
  const index = bandIndexForAqi(aqi);
  return index < 0 ? null : { ...AQI_BANDS[index], index };
}

/**
 * What a household should do at a given band. Sensitive households (children, seniors,
 * people with lung or heart conditions, pregnancy) act one band earlier, which follows
 * the common public-health practice of advising sensitive groups at lower thresholds.
 * @param {number} bandIndex index into AQI_BANDS
 * @param {boolean} sensitive
 * @returns {"ok" | "limit" | "avoid"}
 */
export function verdictFor(bandIndex, sensitive) {
  const effective = bandIndex + (sensitive ? 1 : 0);
  if (effective <= 2) return "ok";
  return effective === 3 ? "limit" : "avoid";
}

/**
 * @param {number} dataTimeMs when the reading applies
 * @param {number} nowMs the current time
 * @returns {{ ageMinutes: number, stale: boolean }}
 */
export function assessFreshness(dataTimeMs, nowMs) {
  const ageMinutes = Math.max(0, Math.round((nowMs - dataTimeMs) / 60000));
  return { ageMinutes, stale: ageMinutes > STALE_AFTER_MINUTES };
}
