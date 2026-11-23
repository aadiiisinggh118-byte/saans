/**
 * Every threshold, factor and label the rules depend on lives here, so the
 * whole decision surface can be reviewed in one place.
 */

/** US AQI bands (the scale Open-Meteo reports). `tone` maps to the UI badge colours. */
export const AQI_BANDS = Object.freeze([
  { id: "good", label: "Good", min: 0, max: 50, tone: "ok" },
  { id: "moderate", label: "Moderate", min: 51, max: 100, tone: "info" },
  { id: "sensitive", label: "Unhealthy for sensitive groups", min: 101, max: 150, tone: "warn" },
  { id: "unhealthy", label: "Unhealthy", min: 151, max: 200, tone: "warn" },
  { id: "very-unhealthy", label: "Very unhealthy", min: 201, max: 300, tone: "bad" },
  { id: "hazardous", label: "Hazardous", min: 301, max: 500, tone: "bad" },
]);

/** The band edges, as numbers the AI is allowed to mention. */
export const AQI_THRESHOLDS = Object.freeze([50, 100, 150, 200, 300]);

/** A reading older than this is flagged as stale on screen. */
export const STALE_AFTER_MINUTES = 180;

/** Parts of the day. `endHour` is inclusive (the evening slot covers 5 pm to 10 pm). */
export const SLOTS = Object.freeze([
  { id: "morning", label: "Morning", startHour: 6, endHour: 11 },
  { id: "afternoon", label: "Afternoon", startHour: 12, endHour: 16 },
  { id: "evening", label: "Evening", startHour: 17, endHour: 21 },
]);

/** From this hour on, the plan is for tomorrow (the day's slots are over). */
export const PLAN_DAY_ROLLOVER_HOUR = 21;

/** Length of the "best time to go out" window, in hours. */
export const BEST_WINDOW_HOURS = 2;

/** Only suggest timing changes when the day's best and worst hours differ by this many AQI points. */
export const MIN_SPREAD_FOR_TIMING = 15;

/** Mask advice starts here for everyone, and one band earlier for sensitive households. */
export const MASK_AQI = 151;
export const MASK_AQI_SENSITIVE = 101;

/** Above this forecast AQI, even the cleanest hour is too smoggy to air the house. */
export const MAX_AQI_FOR_AIRING = 150;

/** Community rule of thumb offered to schools and societies: pause outdoor sports above this AQI. */
export const COMMUNITY_SPORTS_PAUSE_AQI = 200;

export const WORKING_DAYS_PER_WEEK = 5;

/**
 * Indicative emission factors in kg CO2e per passenger-km. They are national
 * averages, so figures built from them are shown as estimates.
 * - car: WRI India, "Pathways to decarbonize India's transport sector" (170 g per passenger-km).
 * - publicTransport: same report (bus average, 97 g per passenger-km). Also used for metro, which
 *   is usually lower, so the saving shown for a metro commute is conservative.
 * - twoWheeler: WRI India (2015), India-specific road transport emission factors
 *   (about 0.0516 kg per km for a motorcycle with one rider).
 */
export const EMISSION_FACTORS = Object.freeze({
  car: 0.17,
  publicTransport: 0.097,
  twoWheeler: 0.0516,
});

export const EMISSION_SOURCES = Object.freeze([
  {
    label: "WRI India: Pathways to decarbonize India's transport sector",
    url: "https://wri-india.org/sites/default/files/Pathways-to-decarbonize-India%E2%80%99s-transport-sector.pdf",
  },
  {
    label: "WRI India (2015): India-specific road transport emission factors",
    url: "https://shaktifoundation.in/wp-content/uploads/2017/06/WRI-2015-India-Specific-Road-Transport-Emission-Factors.pdf",
  },
]);

/** Rough bounding box of India, used to reject coordinates that are plainly elsewhere. */
export const INDIA_BOUNDS = Object.freeze({ minLat: 6, maxLat: 37.5, minLon: 68, maxLon: 98 });

/** Shown next to every reading, so people know what the number is and where it came from. */
export const DATA_SOURCE = Object.freeze({
  name: "Open-Meteo Air Quality API (CAMS model)",
  url: "https://open-meteo.com/en/docs/air-quality-api",
  note: "A modelled estimate on the US AQI scale, not a reading from a ground monitor.",
});

export const HOUSEHOLD_VERDICTS = Object.freeze({
  ok: "Fine for normal outdoor plans",
  limit: "Keep outdoor time short and light",
  avoid: "Stay indoors where you can",
});
