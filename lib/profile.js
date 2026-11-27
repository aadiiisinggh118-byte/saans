/** Household profile: the answers that make advice personal. Options double as the form's choices. */

export const GROUP_OPTIONS = Object.freeze([
  { value: "children", label: "Children (under 12)" },
  { value: "seniors", label: "Seniors (65 or older)" },
  { value: "respiratory", label: "Asthma, heart or lung condition" },
  { value: "pregnant", label: "Someone who is pregnant" },
]);

export const COMMUTE_OPTIONS = Object.freeze([
  { value: "none", label: "No regular commute" },
  { value: "walk_cycle", label: "Walk or cycle" },
  { value: "two_wheeler", label: "Motorbike or scooter" },
  { value: "car", label: "Car" },
  { value: "public", label: "Metro or bus" },
]);

/** The value is a representative one-way distance in km. */
export const DISTANCE_OPTIONS = Object.freeze([
  { value: 3, label: "Under 5 km" },
  { value: 8, label: "5 to 10 km" },
  { value: 15, label: "10 to 20 km" },
  { value: 30, label: "20 to 40 km" },
  { value: 50, label: "More than 40 km" },
]);

export const ACTIVITY_OPTIONS = Object.freeze([
  { value: "none", label: "Nothing in particular" },
  { value: "kids_play", label: "Children playing outside" },
  { value: "exercise", label: "Exercise or a morning walk" },
  { value: "work_outdoors", label: "Outdoor work" },
]);

export const FUEL_OPTIONS = Object.freeze([
  { value: "lpg", label: "LPG cylinder" },
  { value: "png", label: "Piped gas (PNG)" },
  { value: "electric", label: "Induction or electric" },
  { value: "biomass", label: "Wood, dung or coal" },
]);

/**
 * @typedef {object} Profile
 * @property {string[]} groups any of children, seniors, respiratory, pregnant
 * @property {string} commute one of COMMUTE_OPTIONS
 * @property {number} commuteKm one-way distance, one of DISTANCE_OPTIONS
 * @property {string} outdoorActivity one of ACTIVITY_OPTIONS
 * @property {boolean} purifier has an air purifier at home
 * @property {string} cookingFuel one of FUEL_OPTIONS
 * @property {boolean} smokeSources incense, mosquito coils or smoking indoors
 */

/** @type {Profile} */
export const DEFAULT_PROFILE = Object.freeze({
  groups: [],
  commute: "none",
  commuteKm: 15,
  outdoorActivity: "none",
  purifier: false,
  cookingFuel: "lpg",
  smokeSources: false,
});

const oneOf = (options, value, fallback) =>
  options.some((option) => option.value === value) ? value : fallback;

function nearestDistance(value) {
  const km = Number(value);
  if (!Number.isFinite(km)) return DEFAULT_PROFILE.commuteKm;
  return DISTANCE_OPTIONS.reduce(
    (best, option) => (Math.abs(option.value - km) < Math.abs(best - km) ? option.value : best),
    DISTANCE_OPTIONS[0].value,
  );
}

/**
 * Turns anything (form state, localStorage, a request body) into a clean profile.
 * Unknown or tampered values fall back to defaults, so nothing downstream needs to re-check.
 * @param {any} raw
 * @returns {Profile}
 */
export function sanitizeProfile(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const groups = Array.isArray(r.groups)
    ? GROUP_OPTIONS.map((o) => o.value).filter((value) => r.groups.includes(value))
    : [];
  return {
    groups,
    commute: oneOf(COMMUTE_OPTIONS, r.commute, DEFAULT_PROFILE.commute),
    commuteKm: nearestDistance(r.commuteKm),
    outdoorActivity: oneOf(ACTIVITY_OPTIONS, r.outdoorActivity, DEFAULT_PROFILE.outdoorActivity),
    purifier: r.purifier === true,
    cookingFuel: oneOf(FUEL_OPTIONS, r.cookingFuel, DEFAULT_PROFILE.cookingFuel),
    smokeSources: r.smokeSources === true,
  };
}

/**
 * @param {Profile} profile
 * @returns {boolean} true if anyone in the household is more affected by polluted air
 */
export function isSensitive(profile) {
  return profile.groups.length > 0;
}
