import { BEST_WINDOW_HOURS, PLAN_DAY_ROLLOVER_HOUR, SLOTS } from "./constants.js";
import { bandIndexForAqi } from "./aqi.js";
import { addDays, formatHour, istParts } from "./time.js";

const LAST_HOUR = SLOTS[SLOTS.length - 1].endHour;
const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

/**
 * @typedef {object} DayPlan
 * @property {string} planDate IST date the plan covers
 * @property {"Today" | "Tomorrow"} dayLabel
 * @property {{ id: string, label: string, span: string, avgAqi: number, maxAqi: number, bandIndex: number }[]} slots
 * @property {{ startHour: number, endHour: number, label: string, avgAqi: number, bandIndex: number } | null} bestWindow
 * @property {{ hour: number, label: string, aqi: number } | null} worst
 * @property {number[]} hourlyAqi every forecast value used, for number checks
 */

/**
 * Reads the hourly forecast and works out which parts of the day are cleaner. Past hours
 * are ignored, and after the evening slot the plan moves on to tomorrow.
 * @param {import("./air.js").AirReport["hourly"]} hourly
 * @param {number} nowMs
 * @returns {DayPlan}
 */
export function planDay(hourly, nowMs) {
  const now = istParts(nowMs);
  const isToday = now.hour < PLAN_DAY_ROLLOVER_HOUR;
  const planDate = isToday ? now.date : addDays(now.date, 1);
  const firstHour = isToday ? Math.max(now.hour, SLOTS[0].startHour) : SLOTS[0].startHour;

  const hours = hourly
    .map((h) => ({ ...istParts(h.timeMs), usAqi: h.usAqi }))
    .filter(
      (h) =>
        h.date === planDate &&
        h.hour >= firstHour &&
        h.hour <= LAST_HOUR &&
        Number.isFinite(h.usAqi),
    )
    .sort((a, b) => a.hour - b.hour);

  const slots = SLOTS.map((slot) => {
    const values = hours
      .filter((h) => h.hour >= slot.startHour && h.hour <= slot.endHour)
      .map((h) => h.usAqi);
    if (values.length === 0) return null;
    const avgAqi = Math.round(mean(values));
    return {
      id: slot.id,
      label: slot.label,
      span: `${formatHour(slot.startHour)} to ${formatHour(slot.endHour + 1)}`,
      avgAqi,
      maxAqi: Math.round(Math.max(...values)),
      bandIndex: bandIndexForAqi(avgAqi),
    };
  }).filter(Boolean);

  return {
    planDate,
    dayLabel: isToday ? "Today" : "Tomorrow",
    slots,
    bestWindow: findBestWindow(hours),
    worst: findWorst(hours),
    hourlyAqi: hours.map((h) => Math.round(h.usAqi)),
  };
}

function findBestWindow(hours) {
  let best = null;
  for (let i = 0; i + BEST_WINDOW_HOURS <= hours.length; i += 1) {
    const window = hours.slice(i, i + BEST_WINDOW_HOURS);
    const consecutive = window.every((h, j) => j === 0 || h.hour === window[j - 1].hour + 1);
    if (!consecutive) continue;
    const avg = mean(window.map((h) => h.usAqi));
    if (best === null || avg < best.avg) best = { startHour: window[0].hour, avg };
  }
  if (best === null && hours.length > 0) {
    // Fewer than two connected hours of forecast: fall back to the single cleanest hour.
    const single = hours.reduce((a, b) => (b.usAqi < a.usAqi ? b : a));
    best = { startHour: single.hour, avg: single.usAqi, size: 1 };
  }
  if (best === null) return null;
  const size = best.size ?? BEST_WINDOW_HOURS;
  const avgAqi = Math.round(best.avg);
  return {
    startHour: best.startHour,
    endHour: best.startHour + size,
    label: `${formatHour(best.startHour)} to ${formatHour(best.startHour + size)}`,
    avgAqi,
    bandIndex: bandIndexForAqi(avgAqi),
  };
}

function findWorst(hours) {
  if (hours.length === 0) return null;
  const worst = hours.reduce((a, b) => (b.usAqi > a.usAqi ? b : a));
  return { hour: worst.hour, label: formatHour(worst.hour), aqi: Math.round(worst.usAqi) };
}
