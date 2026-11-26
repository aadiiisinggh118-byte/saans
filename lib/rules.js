import { AQI_BANDS, HOUSEHOLD_VERDICTS } from "./constants.js";
import { assessFreshness, bandForAqi, verdictFor } from "./aqi.js";
import { isSensitive } from "./profile.js";
import { planDay } from "./planner.js";
import { GREENER_RULES } from "./rules/greenerRules.js";
import { INDOOR_RULES } from "./rules/indoorRules.js";
import { ROUTINE_RULES } from "./rules/routineRules.js";

const LIMITS = { routine: 6, indoor: 6, greener: 5 };

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
 * @returns {import("./rules/action.js").Action[]} every action, in display order
 */
export function allActions(advice) {
  return [...advice.routine, ...advice.indoor, ...advice.greener];
}
