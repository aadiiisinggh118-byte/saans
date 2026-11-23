import {
  AQI_BANDS,
  COMMUNITY_SPORTS_PAUSE_AQI,
  HOUSEHOLD_VERDICTS,
  MASK_AQI,
  MASK_AQI_SENSITIVE,
  MAX_AQI_FOR_AIRING,
  MIN_SPREAD_FOR_TIMING,
  WORKING_DAYS_PER_WEEK,
} from "./constants.js";
import { assessFreshness, bandForAqi, verdictFor } from "./aqi.js";
import {
  activeTravelSavingKg,
  carpoolSavingKg,
  carToTransitSavingKg,
  fewerTripsSavingKg,
  roundKg,
} from "./impact.js";
import { isSensitive } from "./profile.js";
import { planDay } from "./planner.js";

const LIMITS = { routine: 6, indoor: 6, greener: 5 };
const SHORT_TRIP_KM = 5;
const MIN_TRANSIT_KM = 3;

/**
 * @typedef {object} Action
 * @property {string} id stable identifier; the AI may only refer to ids issued here
 * @property {"routine" | "indoor" | "greener"} area
 * @property {number} priority lower comes first
 * @property {string} title what to do
 * @property {string} why the reason, in terms of today's data and this household
 * @property {string} impact the direct effect of doing it
 */

const action = (id, area, priority, title, why, impact) => ({
  id,
  area,
  priority,
  title,
  why,
  impact,
});

/* ----------------------------- Daily routine ----------------------------- */

function timingRule({ best, worst, dayLabel }) {
  if (!best || !worst || worst.aqi - best.avgAqi < MIN_SPREAD_FOR_TIMING) return null;
  return action(
    "timing",
    "routine",
    10,
    `Plan outdoor time for ${best.label}`,
    `${dayLabel}'s forecast is cleanest around ${best.label} (about AQI ${best.avgAqi}) and worst around ${worst.label} (about AQI ${worst.aqi}).`,
    `Going out in the cleaner window means breathing air that is about ${worst.aqi - best.avgAqi} AQI points better than at the worst hour.`,
  );
}

function outdoorGeneralRule({ verdict, aqi, band, best }) {
  if (verdict === "ok") return null;
  const avoid = verdict === "avoid";
  return action(
    "outdoor-general",
    "routine",
    avoid ? 8 : 30,
    avoid
      ? "Skip non-essential outdoor trips today"
      : `Keep time outdoors short${best ? `, ideally ${best.label}` : ""}`,
    `The air is ${band.label.toLowerCase()} (AQI ${aqi}), and fine particles reach deep into the lungs even during short errands.`,
    avoid
      ? "Every trip you postpone or combine is time you are not breathing smog, and one fewer vehicle on a road that is already congested."
      : "Shorter, planned outings cut how much polluted air you breathe in, and combined trips mean fewer vehicle starts.",
  );
}

function kidsRule({ profile, groups, verdict, best, band, aqi }) {
  if (!groups.has("children") || profile.outdoorActivity !== "kids_play") return null;
  const why =
    "Children breathe faster for their size and their lungs are still developing, so the same air affects them more than adults.";
  if (verdict === "ok") {
    return action(
      "kids-play",
      "routine",
      25,
      "Outdoor play is fine today",
      `The air is ${band.label.toLowerCase()} (AQI ${aqi}).`,
      "Normal outdoor play adds little extra exposure at this level. Keep water handy and re-check later in the day.",
    );
  }
  if (verdict === "limit") {
    return action(
      "kids-play",
      "routine",
      12,
      `Keep outdoor play short and gentle${best ? `, ideally ${best.label}` : ""}`,
      why,
      "A short, easy session in the cleanest window exposes children to less than a long game at the worst hour.",
    );
  }
  return action(
    "kids-play",
    "routine",
    6,
    "Move play indoors today",
    why,
    "Indoor play avoids outdoor smog for the day. Try dancing, indoor games or a family workout.",
  );
}

function exerciseRule({ profile, verdict, best, band, aqi }) {
  if (profile.outdoorActivity !== "exercise") return null;
  if (verdict === "ok") {
    return action(
      "exercise",
      "routine",
      26,
      "Your usual outdoor exercise is fine today",
      `The air is ${band.label.toLowerCase()} (AQI ${aqi}).`,
      `${best ? `${best.label} is the cleanest slot if you can choose. ` : ""}Re-check before you head out, as air changes through the day.`,
    );
  }
  const why = "Harder breathing pulls more polluted air deeper into your lungs.";
  if (verdict === "limit") {
    return action(
      "exercise",
      "routine",
      13,
      `Make it a light walk${best ? ` around ${best.label}` : ""}, not a hard workout`,
      why,
      "Keeping effort light cuts how much polluted air you inhale compared with a hard run.",
    );
  }
  return action(
    "exercise",
    "routine",
    7,
    "Exercise indoors today",
    why,
    "An indoor workout removes the extra intake that hard outdoor exercise adds.",
  );
}

function outdoorWorkRule({ profile, verdict, best }) {
  if (profile.outdoorActivity !== "work_outdoors" || verdict === "ok") return null;
  return action(
    "outdoor-work",
    "routine",
    9,
    "Protect yourself during outdoor work",
    "Hours of outdoor work in smog add up, and heavy effort makes you breathe in more of it.",
    `A fitted N95, regular breaks in cleaner indoor spaces${best ? ` and heavy tasks around ${best.label}` : ""} all lower how much smog you breathe in each day.`,
  );
}

function maskRule({ aqi, sensitive, profile }) {
  const threshold = sensitive ? MASK_AQI_SENSITIVE : MASK_AQI;
  const outdoors = profile.commute !== "none" || profile.outdoorActivity !== "none";
  if (aqi < threshold || !outdoors) return null;
  return action(
    "mask",
    "routine",
    15,
    "Wear a well-fitted N95 or FFP2 mask outdoors",
    "Cloth and surgical masks let most fine PM2.5 particles through, and a respirator only works if it seals around the nose and cheeks.",
    "A properly fitted N95 is rated to filter at least 95% of fine test particles; a loose mask filters far less.",
  );
}

function commuteRule({ profile, verdict, best }) {
  if (verdict === "ok") return null;
  switch (profile.commute) {
    case "car":
      return action(
        "commute",
        "routine",
        16,
        "Keep car windows up on recirculate, and combine errands into one trip",
        "Closed windows and recirculation keep traffic fumes out of the cabin, and every extra trip adds time in heavy traffic.",
        `Fewer, combined trips mean less time on smoggy roads${best ? `; ${best.label} is the best slot for them` : ""}.`,
      );
    case "two_wheeler":
      return action(
        "commute",
        "routine",
        11,
        "Take the metro or bus for long trips today, or ride in an N95",
        "Riders sit in traffic fumes with nothing between them and the road, and a helmet does not filter air.",
        "An enclosed metro or bus takes you off the road, so you breathe less roadside smoke on the way.",
      );
    case "public":
      return action(
        "commute",
        "routine",
        17,
        "Wear an N95 while waiting at roadside stops",
        "Waiting beside traffic is the highest-exposure moment of a metro or bus commute.",
        "A fitted mask cuts what you breathe at the stop; inside a closed coach the air is usually better than on the road.",
      );
    case "walk_cycle":
      return action(
        "commute",
        "routine",
        14,
        `Walk or cycle${best ? ` around ${best.label}` : " at the cleanest hour"}, away from main roads`,
        "Moving briskly makes you breathe more, and the air beside busy roads is dirtier than on quiet streets.",
        "A quieter route in a cleaner hour lowers the pollution you take in on the same journey.",
      );
    default:
      return null;
  }
}

function clearDayRule({ verdict, band, aqi }) {
  if (verdict !== "ok") return null;
  return action(
    "clear-day",
    "routine",
    30,
    "Air is good for your normal routine",
    `AQI ${aqi} is in the ${band.label.toLowerCase()} range for your household.`,
    "A good day to open windows for fresh air, walk or cycle short trips and let children play outside.",
  );
}

/* ------------------------------ Indoor air ------------------------------- */

function sealRule({ verdict, best }) {
  if (verdict === "ok") return null;
  const canAir = best && best.avgAqi <= MAX_AQI_FOR_AIRING;
  return action(
    "seal",
    "indoor",
    10,
    "Keep windows and doors closed through the smoggy hours",
    "Fine particles from outdoors seep in through open windows and gaps, so your home's air follows the air outside.",
    canAir
      ? `Air the house briefly (10 to 15 minutes) only around ${best.label}, when the forecast is cleanest, then close up again.`
      : "The forecast stays smoggy all day, so keep windows closed and ventilate only while cooking, with the exhaust on.",
  );
}

function purifierRule({ profile, verdict, sensitive }) {
  if (profile.purifier) {
    return action(
      "purifier",
      "indoor",
      12,
      "Run your purifier in the room you use most, with doors and windows shut",
      "A purifier only cleans the room it is in, and only when outdoor air is not pouring in.",
      "If its display shows poor air, close any open windows, check that the filter is not clogged, and stop indoor sources such as incense or frying.",
    );
  }
  if (verdict === "ok" && !sensitive) return null;
  return action(
    "purifier",
    "indoor",
    14,
    "Consider a HEPA purifier for the bedroom, or a low-cost box-fan filter",
    "Without a purifier, indoor particle levels largely track the air outside.",
    "A purifier in the bedroom protects the hours you spend sleeping, about a third of the day. A box fan taped to a high-grade furnace filter is a cheap do-it-yourself alternative.",
  );
}

function cookingRule({ profile }) {
  if (profile.cookingFuel === "biomass") {
    return action(
      "cooking",
      "indoor",
      8,
      "Cook with a chimney or vent, and move towards LPG, PNG or induction",
      "Cooking on wood, dung or coal is a major source of indoor fine particles, on top of the smog outside.",
      "A working vent removes smoke at the source, and a cleaner fuel removes most of it.",
    );
  }
  if (profile.cookingFuel === "electric") return null;
  return action(
    "cooking",
    "indoor",
    18,
    "Switch on the chimney or exhaust fan while cooking, and for 15 minutes after",
    "Cooking, especially frying, releases fine particles that add to indoor air pollution.",
    "Venting at the source keeps kitchen pollution from spreading through the home.",
  );
}

function smokeSourcesRule({ profile, verdict }) {
  if (!profile.smokeSources || verdict === "ok") return null;
  return action(
    "indoor-sources",
    "indoor",
    9,
    "Pause incense, mosquito coils and smoking indoors on smoggy days",
    "They release fine particles straight into air that is already harder to clean.",
    "Moving them outdoors or to a ventilated spot removes a source you control completely.",
  );
}

function dustRule({ verdict }) {
  if (verdict === "ok") return null;
  return action(
    "dust",
    "indoor",
    20,
    "Wet-mop or wipe with a damp cloth instead of dry sweeping",
    "Dry sweeping lifts settled dust back into the air you breathe.",
    "Damp cleaning traps dust instead of stirring it up.",
  );
}

function bedroomRule({ sensitive, verdict }) {
  if (!sensitive || verdict === "ok") return null;
  return action(
    "clean-room",
    "indoor",
    11,
    "Make one clean room: seal the bedroom door and window gaps",
    "Children, seniors and people with lung or heart conditions are affected most, and a single sealed room is easier to keep clean than a whole house.",
    "A draught strip on the door and a purifier or box-fan filter inside give the most sensitive family members a safer place to rest.",
  );
}

function plantsRule({ verdict }) {
  if (verdict === "ok") return null;
  return action(
    "plants",
    "indoor",
    40,
    "Keep indoor plants as a bonus, not a fix",
    "Plants make a home pleasant, but studies of real homes find they have little measurable effect on fine smog particles.",
    "Sealing gaps and filtering the air will do far more for your family's lungs than plants alone.",
  );
}

/* ---------------------------- Greener choices ---------------------------- */

const kgPerWeek = (kg) => `${roundKg(kg)} kg CO₂e`;

function carToTransitRule({ profile }) {
  if (profile.commute !== "car" || profile.commuteKm < MIN_TRANSIT_KM) return null;
  const all = carToTransitSavingKg(profile.commuteKm, WORKING_DAYS_PER_WEEK);
  const two = carToTransitSavingKg(profile.commuteKm, 2);
  return action(
    "g-car-to-transit",
    "greener",
    10,
    "Take the metro or bus for your commute on some days",
    "Every car trip adds tailpipe emissions to the same air your neighbourhood breathes, and public transport carries many people per vehicle.",
    `About ${kgPerWeek(all)} less per week if you switch all ${WORKING_DAYS_PER_WEEK} days, or about ${kgPerWeek(two)} if you start with 2 days (estimate for a ${profile.commuteKm} km one-way commute).`,
  );
}

function carpoolRule({ profile }) {
  if (profile.commute !== "car") return null;
  const saving = carpoolSavingKg(profile.commuteKm, WORKING_DAYS_PER_WEEK);
  return action(
    "g-carpool",
    "greener",
    11,
    "Share the ride with a colleague or neighbour",
    "A shared car takes a vehicle off the road for the same journey.",
    `About ${kgPerWeek(saving)} less per week, per person, when two people share your ${WORKING_DAYS_PER_WEEK}-day commute (estimate).`,
  );
}

function activeTravelRule({ profile, verdict }) {
  const motorised = profile.commute === "car" || profile.commute === "two_wheeler";
  if (!motorised || profile.commuteKm > SHORT_TRIP_KM || verdict !== "ok") return null;
  const saving = activeTravelSavingKg(profile.commute, profile.commuteKm, WORKING_DAYS_PER_WEEK);
  return action(
    "g-walk-cycle",
    "greener",
    12,
    "Walk or cycle your short commute on clean-air days",
    "Today's air is good enough for exercise outdoors, and short trips are where walking and cycling replace a vehicle most easily.",
    `About ${kgPerWeek(saving)} less per week if you switch all ${WORKING_DAYS_PER_WEEK} days (estimate), plus the exercise.`,
  );
}

function fewerTripsRule({ profile }) {
  const saving = fewerTripsSavingKg(profile.commute, profile.commuteKm);
  if (saving <= 0) return null;
  return action(
    "g-fewer-trips",
    "greener",
    20,
    "Cut one commute day a week: work from home, or combine errands",
    "The cleanest trip is the one you do not make, and combined errands avoid repeated cold starts and traffic.",
    `About ${kgPerWeek(saving)} less per week for each commute day you remove (estimate for a ${profile.commuteKm} km one-way trip).`,
  );
}

function idlingRule({ profile }) {
  if (profile.commute !== "car" && profile.commute !== "two_wheeler") return null;
  return action(
    "g-idling",
    "greener",
    30,
    "Switch the engine off at long stops and red lights",
    "An idling engine keeps burning fuel and releasing exhaust while going nowhere.",
    "Less exhaust at junctions, school gates and parking areas, where many people stand close by.",
  );
}

function noBurningRule() {
  return action(
    "g-no-burning",
    "greener",
    40,
    "Never burn leaves, rubbish or crop waste, and skip firecrackers",
    "Open burning is a direct source of the fine particles that make winter smog worse, and it is hard to undo once the smoke is in the air.",
    "A single bonfire of rubbish can foul the air for a whole street, so one household choosing not to burn helps everyone nearby.",
  );
}

function communityRule() {
  return action(
    "g-community",
    "greener",
    50,
    "Agree community rules with your society, school or office",
    "Smog is shared air, so some fixes only work when a whole neighbourhood acts together.",
    `Ideas to raise: pause outdoor sports above AQI ${COMMUNITY_SPORTS_PAUSE_AQI}, cover and sprinkle construction dust, limit generator use, and start a carpool group.`,
  );
}

const ROUTINE_RULES = [
  timingRule,
  outdoorGeneralRule,
  kidsRule,
  exerciseRule,
  outdoorWorkRule,
  maskRule,
  commuteRule,
  clearDayRule,
];
const INDOOR_RULES = [
  sealRule,
  purifierRule,
  cookingRule,
  smokeSourcesRule,
  dustRule,
  bedroomRule,
  plantsRule,
];
const GREENER_RULES = [
  carToTransitRule,
  carpoolRule,
  activeTravelRule,
  fewerTripsRule,
  idlingRule,
  noBurningRule,
  communityRule,
];

function collect(rules, context, limit) {
  return rules
    .map((rule) => rule(context))
    .filter(Boolean)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/**
 * Builds the whole deterministic plan: what the air is, what it means for this household,
 * and a ranked list of actions with the reason and the impact of each. Pure: the same
 * inputs always give the same plan, and it never touches the network.
 * @param {{ air: import("./air.js").AirReport, place: { label: string }, profile: import("./profile.js").Profile, nowMs: number }} input
 */
export function buildAdvice({ air, place, profile, nowMs }) {
  const band = bandForAqi(air.usAqi);
  const sensitive = isSensitive(profile);
  const verdict = verdictFor(band.index, sensitive);
  const plan = planDay(air.hourly, nowMs);
  const context = {
    aqi: air.usAqi,
    band,
    sensitive,
    verdict,
    profile,
    groups: new Set(profile.groups),
    best: plan.bestWindow,
    worst: plan.worst,
    dayLabel: plan.dayLabel,
  };

  const routine = collect(ROUTINE_RULES, context, LIMITS.routine);
  const indoor = collect(INDOOR_RULES, context, LIMITS.indoor);
  const greener = collect(GREENER_RULES, context, LIMITS.greener);

  return {
    place: place.label,
    reading: {
      usAqi: air.usAqi,
      pm25: air.pm25,
      pm10: air.pm10,
      dataTime: air.dataTime,
      dataTimeMs: air.dataTimeMs,
      fetchedAt: air.fetchedAt,
      source: air.source,
      ...assessFreshness(air.dataTimeMs, nowMs),
    },
    band,
    sensitive,
    verdict,
    verdictText: HOUSEHOLD_VERDICTS[verdict],
    dayLabel: plan.dayLabel,
    slots: plan.slots.map((slot) => ({
      ...slot,
      band: AQI_BANDS[slot.bandIndex],
      verdict: verdictFor(slot.bandIndex, sensitive),
    })),
    bestWindow: plan.bestWindow,
    worst: plan.worst,
    hourlyAqi: plan.hourlyAqi,
    routine,
    indoor,
    greener,
  };
}

/**
 * @param {ReturnType<typeof buildAdvice>} advice
 * @returns {import("./rules.js").Action[]} every action, in display order
 */
export function allActions(advice) {
  return [...advice.routine, ...advice.indoor, ...advice.greener];
}
