/**
 * India uses a single time zone (IST, UTC+05:30, no daylight saving), so all
 * date maths here is done in IST without a time-zone library.
 */
const IST_OFFSET_MS = 330 * 60 * 1000;
const LOCAL_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

/**
 * Parses a local IST timestamp such as "2026-11-22T08:00", as Open-Meteo returns it.
 * @param {unknown} text
 * @returns {number | null} epoch milliseconds, or null if the text is not a valid timestamp
 */
export function parseLocalIst(text) {
  const match = typeof text === "string" ? LOCAL_TIME_RE.exec(text) : null;
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  return Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MS;
}

/**
 * @param {number} ms epoch milliseconds
 * @returns {{ date: string, hour: number, minute: number }} the IST calendar date and clock time
 */
export function istParts(ms) {
  const shifted = new Date(ms + IST_OFFSET_MS);
  return {
    date: shifted.toISOString().slice(0, 10),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/**
 * @param {string} date "YYYY-MM-DD"
 * @param {number} days may be negative
 * @returns {string} "YYYY-MM-DD"
 */
export function addDays(date, days) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * 86400000).toISOString().slice(0, 10);
}

/**
 * @param {number} hour 0 to 24
 * @returns {string} for example "6 am", "12 pm", "10 pm"
 */
export function formatHour(hour) {
  const h = hour % 24;
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "am" : "pm"}`;
}

/**
 * @param {number} ms epoch milliseconds
 * @returns {string} the IST clock time, for example "8:05 am"
 */
export function formatClock(ms) {
  const { hour, minute } = istParts(ms);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, "0")} ${
    hour < 12 ? "am" : "pm"
  }`;
}
