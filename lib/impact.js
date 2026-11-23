import { EMISSION_FACTORS, WORKING_DAYS_PER_WEEK } from "./constants.js";

const FACTOR_BY_MODE = Object.freeze({
  car: EMISSION_FACTORS.car,
  two_wheeler: EMISSION_FACTORS.twoWheeler,
  public: EMISSION_FACTORS.publicTransport,
});

/** @param {number} kg @returns {number} one decimal under 10 kg, whole numbers above */
export function roundKg(kg) {
  return kg >= 10 ? Math.round(kg) : Math.round(kg * 10) / 10;
}

/**
 * @param {number} oneWayKm
 * @param {number} [days] commuting days per week
 * @returns {number} return-trip kilometres per week
 */
export function weeklyKm(oneWayKm, days = WORKING_DAYS_PER_WEEK) {
  return oneWayKm * 2 * days;
}

/**
 * kg CO2e per week saved by moving the commute from car to metro or bus.
 * @param {number} oneWayKm
 * @param {number} days days per week switched
 */
export function carToTransitSavingKg(oneWayKm, days) {
  return weeklyKm(oneWayKm, days) * (EMISSION_FACTORS.car - EMISSION_FACTORS.publicTransport);
}

/**
 * kg CO2e per week saved by sharing the car with one co-rider (the car's emissions are halved per person).
 * @param {number} oneWayKm
 * @param {number} days days per week shared
 */
export function carpoolSavingKg(oneWayKm, days) {
  return weeklyKm(oneWayKm, days) * EMISSION_FACTORS.car * 0.5;
}

/**
 * kg CO2e per week saved by removing one full commute day (working from home or combining trips).
 * @param {string} mode car, two_wheeler or public
 * @param {number} oneWayKm
 * @returns {number} 0 for modes with no tailpipe emissions
 */
export function fewerTripsSavingKg(mode, oneWayKm) {
  return oneWayKm * 2 * (FACTOR_BY_MODE[mode] ?? 0);
}

/**
 * kg CO2e per week saved by walking or cycling the commute instead of driving or riding.
 * @param {string} mode car or two_wheeler
 * @param {number} oneWayKm
 * @param {number} days
 */
export function activeTravelSavingKg(mode, oneWayKm, days) {
  return weeklyKm(oneWayKm, days) * (FACTOR_BY_MODE[mode] ?? 0);
}
