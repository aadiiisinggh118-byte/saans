import { MAX_AQI_FOR_AIRING } from "../constants.js";
import { action } from "./action.js";

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

/** Every indoor-air rule. */
export const INDOOR_RULES = [
  sealRule,
  purifierRule,
  cookingRule,
  smokeSourcesRule,
  dustRule,
  bedroomRule,
  plantsRule,
];
