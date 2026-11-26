import { COMMUNITY_SPORTS_PAUSE_AQI, WORKING_DAYS_PER_WEEK } from "../constants.js";
import {
  activeTravelSavingKg,
  carpoolSavingKg,
  carToTransitSavingKg,
  fewerTripsSavingKg,
  roundKg,
} from "../impact.js";
import { action } from "./action.js";

const SHORT_TRIP_KM = 5;
const MIN_TRANSIT_KM = 3;

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

/** Every greener-choice rule. */
export const GREENER_RULES = [
  carToTransitRule,
  carpoolRule,
  activeTravelRule,
  fewerTripsRule,
  idlingRule,
  noBurningRule,
  communityRule,
];
