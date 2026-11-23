import {
  activeTravelSavingKg,
  carpoolSavingKg,
  carToTransitSavingKg,
  fewerTripsSavingKg,
  roundKg,
  weeklyKm,
} from "../../lib/impact.js";
import { DEFAULT_PROFILE, isSensitive, sanitizeProfile } from "../../lib/profile.js";
import { cleanText, validateAdviceRequest, validateAirRequest } from "../../lib/requests.js";

describe("sanitizeProfile", () => {
  it("falls back to defaults for garbage", () => {
    expect(sanitizeProfile(null)).toEqual(DEFAULT_PROFILE);
    expect(sanitizeProfile("nope")).toEqual(DEFAULT_PROFILE);
    expect(sanitizeProfile({ commute: "rocket", cookingFuel: 5 })).toEqual(DEFAULT_PROFILE);
  });

  it("keeps only known household groups", () => {
    expect(sanitizeProfile({ groups: ["children", "wizards", "seniors"] }).groups).toEqual([
      "children",
      "seniors",
    ]);
  });

  it("snaps a distance to the nearest option", () => {
    expect(sanitizeProfile({ commuteKm: 12 }).commuteKm).toBe(15);
    expect(sanitizeProfile({ commuteKm: 1000 }).commuteKm).toBe(50);
    expect(sanitizeProfile({ commuteKm: "abc" }).commuteKm).toBe(15);
  });

  it("only accepts real booleans", () => {
    expect(sanitizeProfile({ purifier: "yes", smokeSources: 1 })).toMatchObject({
      purifier: false,
      smokeSources: false,
    });
    expect(sanitizeProfile({ purifier: true }).purifier).toBe(true);
  });

  it("is idempotent", () => {
    const once = sanitizeProfile({ groups: ["children"], commute: "car", commuteKm: 8 });
    expect(sanitizeProfile(once)).toEqual(once);
  });

  it("knows whether a household is sensitive", () => {
    expect(isSensitive(sanitizeProfile({}))).toBe(false);
    expect(isSensitive(sanitizeProfile({ groups: ["pregnant"] }))).toBe(true);
  });
});

describe("request validation", () => {
  it("cleans text of control characters and extra spaces", () => {
    expect(cleanText("  Noida \u0000\n  UP  ")).toBe("Noida UP");
    expect(cleanText(42)).toBe("");
    expect(cleanText("x".repeat(500), 20)).toHaveLength(20);
  });

  it("accepts a place name", () => {
    expect(validateAirRequest({ query: " Noida " })).toEqual({
      ok: true,
      errors: {},
      value: { query: "Noida" },
    });
  });

  it("accepts coordinates inside India and rounds them", () => {
    const result = validateAirRequest({ lat: 28.61234, lon: 77.20987, name: "Delhi" });
    expect(result.value).toEqual({ lat: 28.61, lon: 77.21, name: "Delhi" });
  });

  it.each([
    [{}],
    [{ query: "a" }],
    [{ query: 5 }],
    [{ lat: 51.5, lon: -0.12 }],
    [{ lat: "28.6", lon: "77.2" }],
    [null],
    ["text"],
  ])("rejects a bad air request: %j", (body) => {
    const result = validateAirRequest(body);
    expect(result.ok).toBe(false);
    expect(result.errors.location).toMatch(/city or area in India/);
  });

  it("builds a clean advice request", () => {
    const result = validateAdviceRequest({
      lat: 19.07,
      lon: 72.87,
      name: "Mumbai",
      profile: { commute: "car", groups: ["children", "zzz"] },
      language: "hi",
      question: "  Can I   jog? ",
    });
    expect(result.ok).toBe(true);
    expect(result.value.profile.groups).toEqual(["children"]);
    expect(result.value.language).toBe("hi");
    expect(result.value.question).toBe("Can I jog?");
  });

  it("falls back to English for an unknown language and caps the question", () => {
    const result = validateAdviceRequest({
      lat: 19.07,
      lon: 72.87,
      language: "xx",
      question: "a".repeat(999),
    });
    expect(result.value.language).toBe("en");
    expect(result.value.question).toHaveLength(200);
  });

  it("requires coordinates for advice, because the server re-reads the air itself", () => {
    expect(validateAdviceRequest({ query: "Delhi" }).ok).toBe(false);
    expect(validateAdviceRequest({ lat: 0, lon: 0 }).ok).toBe(false);
  });
});

describe("impact maths", () => {
  it("counts return-trip kilometres per week", () => {
    expect(weeklyKm(15)).toBe(150);
    expect(weeklyKm(15, 2)).toBe(60);
  });

  it("computes the car-to-transit saving", () => {
    expect(carToTransitSavingKg(15, 5)).toBeCloseTo(10.95, 2);
  });

  it("computes the carpool saving as half the car's emissions", () => {
    expect(carpoolSavingKg(15, 5)).toBeCloseTo(12.75, 2);
  });

  it("computes fewer trips by mode, and zero for modes with no tailpipe", () => {
    expect(fewerTripsSavingKg("car", 15)).toBeCloseTo(5.1, 2);
    expect(fewerTripsSavingKg("two_wheeler", 15)).toBeCloseTo(1.548, 3);
    expect(fewerTripsSavingKg("walk_cycle", 15)).toBe(0);
    expect(fewerTripsSavingKg("none", 15)).toBe(0);
  });

  it("computes the saving from walking instead of driving", () => {
    expect(activeTravelSavingKg("car", 3, 5)).toBeCloseTo(5.1, 2);
  });

  it("rounds to one decimal under 10 kg and to whole numbers above", () => {
    expect(roundKg(4.38)).toBe(4.4);
    expect(roundKg(10.95)).toBe(11);
    expect(roundKg(12.75)).toBe(13);
  });
});
