// Validator for Gemini's JSON. Allowed ids always come from the deterministic rules for THIS
// request, so the model cannot invent an action.
//
// Two kinds of check, on purpose:
//  - SAFETY (strict): only known ids, every id exactly once, no misquoted air readings,
//    no medicine or dosage advice.
//  - LAYOUT (generous): length caps that only catch runaway output. Models are poor at
//    counting characters, so tight limits would reject good answers.

import { AQI_THRESHOLDS } from "./constants.js";

export const LIMITS = { headline: 600, explanation: 520, answer: 900 };

// Medicine is outside what this app can safely advise on.
const MEDICAL_RE =
  /\b(dose|dosage|dosing|mg|milligrams?|tablets?|capsules?|prescri\w+|antibiotics?|steroids?)\b/i;

// An air reading written next to its label, e.g. "AQI 340", "PM2.5 of 150", "340 AQI".
const LABELLED_AFTER_RE = /(?:AQI|PM\s?2\.?5|PM\s?10)[^\d\n]{0,14}(\d{1,4}(?:\.\d+)?)/gi;
const LABELLED_BEFORE_RE = /(\d{1,4}(?:\.\d+)?)\s*(?:US\s*)?AQI/gi;

/**
 * @param {unknown} value
 * @returns {boolean} true if the text gives medication or dosage advice
 */
export const mentionsMedicine = (value) => MEDICAL_RE.test(String(value));

/**
 * Finds readings the model quoted that are not in the data it was given.
 * @param {string} text
 * @param {Iterable<number>} allowed numbers the model may quote
 * @returns {string[]} the offending numbers, empty if all are genuine
 */
export function findInventedReadings(text, allowed) {
  const ok = new Set([...allowed].map((n) => Math.round(n)));
  const found = [];
  for (const re of [LABELLED_AFTER_RE, LABELLED_BEFORE_RE]) {
    for (const match of String(text).matchAll(re)) {
      if (!ok.has(Math.round(Number(match[1])))) found.push(match[1]);
    }
  }
  return found;
}

/**
 * Numbers the model is allowed to quote next to an AQI or PM label.
 * @param {ReturnType<typeof import("./rules.js").buildAdvice>} advice
 * @returns {number[]}
 */
export function allowedReadings(advice) {
  const values = [
    advice.reading.usAqi,
    advice.reading.pm25,
    advice.reading.pm10,
    ...AQI_THRESHOLDS,
    ...advice.hourlyAqi,
    ...advice.slots.flatMap((slot) => [slot.avgAqi, slot.maxAqi]),
  ];
  if (advice.bestWindow) values.push(advice.bestWindow.avgAqi);
  if (advice.worst) values.push(advice.worst.aqi);
  return values.filter((v) => Number.isFinite(v));
}

const text = (value) => (typeof value === "string" ? value.trim() : value);

function checkText(errors, path, value, max, allowed) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${path} must be a non-empty string.`);
    return;
  }
  if (value.length > max) errors.push(`${path} is too long (max ${max} characters).`);
  if (mentionsMedicine(value)) errors.push(`${path} must not give medicine or dosage advice.`);
  const invented = findInventedReadings(value, allowed);
  if (invented.length) {
    errors.push(`${path} quotes an air reading (${invented.join(", ")}) that is not in the data.`);
  }
}

/**
 * Validates Gemini's answer for the advice route.
 * @param {any} parsed
 * @param {{ actionIds: string[], allowedNumbers: number[], questionAsked: boolean }} expected
 * @returns {{ valid: boolean, errors: string[], value?: { headline: string, actions: { id: string, explanation: string }[], answer: string } }}
 */
export function validateAdviceNarration(parsed, { actionIds, allowedNumbers, questionAsked }) {
  if (!parsed || typeof parsed !== "object") {
    return { valid: false, errors: ["Response is not a JSON object."] };
  }
  const errors = [];
  const headline = text(parsed.headline);
  checkText(errors, "headline", headline, LIMITS.headline, allowedNumbers);

  if (!Array.isArray(parsed.actions) || parsed.actions.length !== actionIds.length) {
    errors.push(`\`actions\` must have exactly one entry for each of: ${actionIds.join(", ")}.`);
    return { valid: false, errors };
  }
  const seen = new Set();
  const actions = parsed.actions.map((raw, i) => {
    const path = `actions[${i}]`;
    if (!raw || typeof raw !== "object") {
      errors.push(`${path} must be an object.`);
      return raw;
    }
    const id = typeof raw.id === "string" ? raw.id.trim().toLowerCase() : raw.id;
    const explanation = text(raw.explanation);
    if (!actionIds.includes(id) || seen.has(id)) {
      errors.push(`${path}.id must be a unique one of: ${actionIds.join(", ")}.`);
    }
    seen.add(id);
    checkText(errors, `${path}.explanation`, explanation, LIMITS.explanation, allowedNumbers);
    return { id, explanation };
  });

  const answer = parsed.answer === null || parsed.answer === undefined ? "" : text(parsed.answer);
  if (questionAsked) checkText(errors, "answer", answer, LIMITS.answer, allowedNumbers);
  else if (answer !== "") errors.push("answer must be empty when no question was asked.");

  return { valid: errors.length === 0, errors, value: { headline, actions, answer } };
}
