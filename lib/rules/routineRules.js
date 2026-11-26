import { MASK_AQI, MASK_AQI_SENSITIVE, MIN_SPREAD_FOR_TIMING } from "../constants.js";
import { action } from "./action.js";

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

/** Every daily-routine rule, in no particular order; the planner ranks the results. */
export const ROUTINE_RULES = [
  timingRule,
  outdoorGeneralRule,
  kidsRule,
  exerciseRule,
  outdoorWorkRule,
  maskRule,
  commuteRule,
  clearDayRule,
];
