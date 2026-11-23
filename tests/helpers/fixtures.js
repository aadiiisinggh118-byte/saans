import { normalizeAirResponse } from "../../lib/air.js";
import { addDays, istParts } from "../../lib/time.js";

/** 08:15 IST on 22 November 2026, the "now" used by deterministic tests. */
export const NOW_MS = Date.UTC(2026, 10, 22, 2, 45);

const pad = (n) => String(n).padStart(2, "0");

/** A smoggy day: worst around 7 am, cleanest around 7 pm. */
export const smogCurve = (hour) => Math.round(230 + 70 * Math.cos(((hour - 7) / 24) * 2 * Math.PI));

/**
 * An Open-Meteo-shaped air-quality response covering `dates`, hour by hour.
 * @param {{ dates?: string[], currentTime?: string, currentAqi?: number | null, curve?: (hour: number, date: string) => number | null }} [options]
 */
export function makeAirJson({
  dates = ["2026-11-22", "2026-11-23"],
  currentTime = "2026-11-22T08:00",
  currentAqi = 288,
  curve = smogCurve,
} = {}) {
  const time = [];
  const usAqi = [];
  const pm25 = [];
  for (const date of dates) {
    for (let hour = 0; hour < 24; hour += 1) {
      time.push(`${date}T${pad(hour)}:00`);
      const value = curve(hour, date);
      usAqi.push(value);
      pm25.push(value === null ? null : Math.round(value * 0.55));
    }
  }
  return {
    current: {
      time: currentTime,
      us_aqi: currentAqi,
      pm2_5: 158.4,
      pm10: 201.2,
      nitrogen_dioxide: 40,
      ozone: 20,
    },
    hourly: { time, us_aqi: usAqi, pm2_5: pm25 },
  };
}

/** A normalized report for the deterministic "now". */
export function makeAir(options) {
  return normalizeAirResponse(makeAirJson(options), NOW_MS);
}

/**
 * A response whose dates follow the real clock, for component tests that cannot fix the time.
 * The current reading is always the current IST hour.
 */
export function makeLiveAirJson(currentAqi = 288) {
  const now = istParts(Date.now());
  return makeAirJson({
    dates: [now.date, addDays(now.date, 1)],
    currentTime: `${now.date}T${pad(now.hour)}:00`,
    currentAqi,
  });
}

/** A fetch Response stand-in. */
export function jsonResponse(body, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}
