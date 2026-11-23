import { normalizeAirResponse, normalizeGeocodeResponse } from "../../lib/air.js";
import { planDay } from "../../lib/planner.js";
import { makeAir, makeAirJson, NOW_MS, smogCurve } from "../helpers/fixtures.js";

describe("normalizeAirResponse", () => {
  it("turns a response into the app's own shape, with the source attached", () => {
    const air = makeAir();
    expect(air.usAqi).toBe(288);
    expect(air.pm25).toBeCloseTo(158.4, 1);
    expect(air.dataTime).toBe("2026-11-22T08:00");
    expect(air.hourly).toHaveLength(48);
    expect(air.source.name).toMatch(/Open-Meteo/);
    expect(air.fetchedAt).toBe(new Date(NOW_MS).toISOString());
  });

  it("falls back to the hourly value when the current AQI is missing", () => {
    const air = makeAir({ currentAqi: null });
    expect(air.usAqi).toBe(smogCurve(8));
  });

  it("refuses to invent a reading when there is none", () => {
    const json = makeAirJson({ currentAqi: null, curve: () => null });
    expect(() => normalizeAirResponse(json, NOW_MS)).toThrow(/no reading/);
  });

  it.each([[null], [{}], [{ current: { time: "bad", us_aqi: 100 } }]])(
    "rejects a malformed response: %j",
    (json) => {
      expect(() => normalizeAirResponse(json, NOW_MS)).toThrow();
    },
  );

  it("keeps missing hourly values as null instead of zero", () => {
    const air = makeAir({ curve: (hour) => (hour === 10 ? null : 150) });
    const missing = air.hourly.find((h) => h.time === "2026-11-22T10:00");
    expect(missing.usAqi).toBeNull();
  });

  it("marks errors as safe to show", () => {
    try {
      normalizeAirResponse({}, NOW_MS);
    } catch (error) {
      expect(error.expose).toBe(true);
    }
  });
});

describe("normalizeGeocodeResponse", () => {
  it("picks the first result in India, skipping other countries", () => {
    const place = normalizeGeocodeResponse({
      results: [
        { name: "Noida", country_code: "US", latitude: 1, longitude: 2 },
        {
          name: "Noida",
          admin1: "Uttar Pradesh",
          country_code: "IN",
          latitude: 28.5,
          longitude: 77.4,
        },
      ],
    });
    expect(place).toEqual({ name: "Noida", label: "Noida, Uttar Pradesh", lat: 28.5, lon: 77.4 });
  });

  it("does not repeat a name that equals its state", () => {
    const place = normalizeGeocodeResponse({
      results: [
        { name: "Delhi", admin1: "Delhi", country_code: "IN", latitude: 28.6, longitude: 77.2 },
      ],
    });
    expect(place.label).toBe("Delhi");
  });

  it.each([[{}], [{ results: [] }], [null], [{ results: [{ name: "X", country_code: "US" }] }]])(
    "returns null when nothing in India matches: %j",
    (json) => {
      expect(normalizeGeocodeResponse(json)).toBeNull();
    },
  );
});

describe("planDay", () => {
  const air = makeAir();
  const expectedAverage = (from, to) => {
    const values = [];
    for (let hour = from; hour <= to; hour += 1) values.push(smogCurve(hour));
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  it("plans today and ignores hours that have already passed", () => {
    const plan = planDay(air.hourly, NOW_MS);
    expect(plan.dayLabel).toBe("Today");
    expect(plan.slots.map((s) => s.id)).toEqual(["morning", "afternoon", "evening"]);
    expect(plan.slots[0].avgAqi).toBe(expectedAverage(8, 11)); // 6 and 7 am are in the past
    expect(plan.slots[1].avgAqi).toBe(expectedAverage(12, 16));
    expect(plan.slots[2].avgAqi).toBe(expectedAverage(17, 21));
  });

  it("finds the cleanest two-hour window and the worst remaining hour", () => {
    const plan = planDay(air.hourly, NOW_MS);
    expect(plan.bestWindow).toMatchObject({ startHour: 18, endHour: 20, label: "6 pm to 8 pm" });
    expect(plan.worst).toMatchObject({ hour: 8, label: "8 am", aqi: smogCurve(8) });
  });

  it("moves on to tomorrow once the day's slots are over", () => {
    const lateNight = Date.UTC(2026, 10, 22, 17, 4); // 22:34 IST
    const plan = planDay(air.hourly, lateNight);
    expect(plan.dayLabel).toBe("Tomorrow");
    expect(plan.planDate).toBe("2026-11-23");
    expect(plan.slots[0].avgAqi).toBe(expectedAverage(6, 11));
  });

  it("returns empty slots and no window when there is no forecast", () => {
    const plan = planDay([], NOW_MS);
    expect(plan.slots).toEqual([]);
    expect(plan.bestWindow).toBeNull();
    expect(plan.worst).toBeNull();
  });

  it("falls back to the single cleanest hour when only one hour remains", () => {
    const onlyOne = air.hourly.filter((h) => h.time === "2026-11-22T19:00");
    const plan = planDay(onlyOne, NOW_MS);
    expect(plan.bestWindow).toMatchObject({ startHour: 19, endHour: 20, label: "7 pm to 8 pm" });
  });

  it("does not build a window across a gap in the forecast", () => {
    const gappy = air.hourly.filter((h) =>
      ["2026-11-22T09:00", "2026-11-22T12:00"].includes(h.time),
    );
    const plan = planDay(gappy, NOW_MS);
    expect(plan.bestWindow.endHour - plan.bestWindow.startHour).toBe(1);
  });

  it("skips hours with missing values", () => {
    const withGap = makeAir({ curve: (hour) => (hour >= 17 && hour <= 21 ? null : 150) });
    const plan = planDay(withGap.hourly, NOW_MS);
    expect(plan.slots.map((s) => s.id)).toEqual(["morning", "afternoon"]);
  });
});
