import { buildAdvice, allActions } from "../../lib/rules.js";
import { sanitizeProfile } from "../../lib/profile.js";
import {
  allowedReadings,
  findInventedReadings,
  mentionsMedicine,
  validateAdviceNarration,
} from "../../lib/validateAI.js";
import { makeAir, NOW_MS } from "../helpers/fixtures.js";

const advice = buildAdvice({
  air: makeAir(),
  place: { label: "Delhi" },
  profile: sanitizeProfile({ groups: ["children"], commute: "car", outdoorActivity: "kids_play" }),
  nowMs: NOW_MS,
});
const actionIds = allActions(advice).map((a) => a.id);
const allowedNumbers = allowedReadings(advice);

const good = (overrides = {}) => ({
  headline: "The air is very unhealthy today, so plan for indoors.",
  actions: actionIds.map((id) => ({ id, explanation: "A short reason that fits your family." })),
  answer: "",
  ...overrides,
});
const check = (parsed, questionAsked = false) =>
  validateAdviceNarration(parsed, { actionIds, allowedNumbers, questionAsked });

describe("validateAdviceNarration", () => {
  it("accepts a complete, honest answer", () => {
    const result = check(good());
    expect(result.valid).toBe(true);
    expect(result.value.actions).toHaveLength(actionIds.length);
  });

  it("tolerates id case and surrounding spaces", () => {
    const parsed = good();
    parsed.actions[0].id = ` ${actionIds[0].toUpperCase()} `;
    expect(check(parsed).valid).toBe(true);
  });

  it("rejects an action id that code never issued", () => {
    const parsed = good();
    parsed.actions[0].id = "invented-action";
    expect(check(parsed).valid).toBe(false);
  });

  it("rejects a repeated id", () => {
    const parsed = good();
    parsed.actions[1].id = parsed.actions[0].id;
    expect(check(parsed).valid).toBe(false);
  });

  it("rejects a missing action", () => {
    const parsed = good();
    parsed.actions.pop();
    expect(check(parsed).valid).toBe(false);
  });

  it.each([[null], ["text"], [{}], [{ headline: "x", actions: "no" }]])(
    "rejects a malformed answer: %j",
    (parsed) => {
      expect(check(parsed).valid).toBe(false);
    },
  );

  it("rejects an air reading that is not in the data", () => {
    const result = check(good({ headline: "Today the AQI is 340, which is dangerous." }));
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/not in the data/);
  });

  it("accepts the real reading, band edges and forecast values", () => {
    const text = "The AQI of 288 is above the 200 mark, and about AQI 160 is expected later.";
    expect(check(good({ headline: text })).valid).toBe(true);
  });

  it("catches a misquoted reading written either way round", () => {
    expect(findInventedReadings("PM2.5 is 999", allowedNumbers)).toEqual(["999"]);
    expect(findInventedReadings("a 777 AQI day", allowedNumbers)).toEqual(["777"]);
    expect(findInventedReadings("No numbers here", allowedNumbers)).toEqual([]);
  });

  it("does not mind other numbers, such as times or minutes", () => {
    const text = "Go out at 6 pm for 15 minutes, with AQI 288 outside.";
    expect(check(good({ headline: text })).valid).toBe(true);
  });

  it.each([
    ["take 500 mg twice a day"],
    ["a higher dose may help"],
    ["ask for a prescription"],
    ["antibiotics can help"],
  ])("rejects medicine or dosage advice: %s", (text) => {
    expect(mentionsMedicine(text)).toBe(true);
    expect(check(good({ headline: text })).valid).toBe(false);
  });

  it("does not flag ordinary health words", () => {
    expect(mentionsMedicine("Keep your inhaler handy and see a doctor if it worsens.")).toBe(false);
  });

  it("requires an answer when a question was asked", () => {
    expect(check(good({ answer: "" }), true).valid).toBe(false);
    expect(check(good({ answer: "Play after 6 pm, briefly." }), true).valid).toBe(true);
  });

  it("requires the answer to be empty when no question was asked", () => {
    expect(check(good({ answer: "Unprompted answer." }), false).valid).toBe(false);
    expect(check(good({ answer: undefined }), false).valid).toBe(true);
  });

  it("rejects runaway output but not a slightly wordy answer", () => {
    expect(check(good({ headline: "x".repeat(700) })).valid).toBe(false);
    expect(check(good({ headline: "A".repeat(550) })).valid).toBe(true);
  });
});
