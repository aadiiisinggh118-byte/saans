import { allActions, buildAdvice } from "../../lib/rules.js";
import { DEFAULT_PROFILE, sanitizeProfile } from "../../lib/profile.js";
import { PERSONAS } from "../../lib/personas.js";
import { makeAir, NOW_MS } from "../helpers/fixtures.js";

const place = { label: "Test City" };
const advise = (profile = {}, airOptions, nowMs = NOW_MS) =>
  buildAdvice({
    air: makeAir(airOptions),
    place,
    profile: sanitizeProfile({ ...DEFAULT_PROFILE, ...profile }),
    nowMs,
  });
const ids = (advice) => allActions(advice).map((a) => a.id);
const flat = (aqi) => ({ currentAqi: aqi, curve: () => aqi });
const persona = (id) => PERSONAS.find((p) => p.id === id);

describe("personalisation", () => {
  it("gives two households in the same city different advice", () => {
    const family = advise(persona("delhi-family").profile);
    const commuter = advise(persona("mumbai-commuter").profile);
    expect(ids(family)).toContain("kids-play");
    expect(ids(commuter)).not.toContain("kids-play");
    expect(ids(family)).not.toEqual(ids(commuter));
  });

  it("moves children indoors on a very unhealthy day", () => {
    const advice = advise(persona("delhi-family").profile);
    const kids = advice.routine.find((a) => a.id === "kids-play");
    expect(kids.title).toBe("Move play indoors today");
  });

  it("lets children play on a good-air day", () => {
    const advice = advise(persona("delhi-family").profile, flat(35));
    expect(advice.routine.find((a) => a.id === "kids-play").title).toBe(
      "Outdoor play is fine today",
    );
    expect(ids(advice)).toContain("clear-day");
    expect(ids(advice)).not.toContain("seal");
  });

  it("tells a scooter rider something different from a car driver", () => {
    const rider = advise({ commute: "two_wheeler" }).routine.find((a) => a.id === "commute");
    const driver = advise({ commute: "car" }).routine.find((a) => a.id === "commute");
    expect(rider.title).not.toBe(driver.title);
  });

  it("every sample persona gets a full plan with all three areas", () => {
    PERSONAS.forEach((p) => {
      const advice = advise(p.profile);
      expect(advice.routine.length).toBeGreaterThan(0);
      expect(advice.indoor.length).toBeGreaterThan(0);
      expect(advice.greener.length).toBeGreaterThan(0);
    });
  });
});

describe("how strict the advice is", () => {
  it("is milder for adults than for a sensitive household at the same AQI", () => {
    const adults = advise({}, flat(160));
    const withChild = advise({ groups: ["children"] }, flat(160));
    expect(adults.verdict).toBe("limit");
    expect(withChild.verdict).toBe("avoid");
  });

  it("recommends a mask from AQI 151 for everyone with outdoor exposure", () => {
    expect(ids(advise({ commute: "car" }, flat(150)))).not.toContain("mask");
    expect(ids(advise({ commute: "car" }, flat(151)))).toContain("mask");
  });

  it("recommends a mask from AQI 101 for a sensitive household", () => {
    expect(ids(advise({ commute: "car", groups: ["seniors"] }, flat(101)))).toContain("mask");
  });

  it("does not recommend a mask to someone who is not going outdoors", () => {
    expect(ids(advise({}, flat(300)))).not.toContain("mask");
  });
});

describe("indoor air", () => {
  it("tells people who own a purifier how to use it, and others to consider one", () => {
    const owner = advise({ purifier: true }).indoor.find((a) => a.id === "purifier");
    const buyer = advise({ purifier: false }).indoor.find((a) => a.id === "purifier");
    expect(owner.title).toMatch(/Run your purifier/);
    expect(buyer.title).toMatch(/Consider a HEPA purifier/);
  });

  it("puts a wood or coal kitchen first and skips cooking advice for induction", () => {
    expect(advise({ cookingFuel: "biomass" }).indoor[0].id).toBe("cooking");
    expect(ids(advise({ cookingFuel: "electric" }))).not.toContain("cooking");
  });

  it("only mentions incense and coils when the household uses them", () => {
    expect(ids(advise({ smokeSources: true }))).toContain("indoor-sources");
    expect(ids(advise({ smokeSources: false }))).not.toContain("indoor-sources");
  });

  it("is honest that plants are not a fix", () => {
    const plants = advise({}).indoor.find((a) => a.id === "plants");
    expect(plants.why).toMatch(/little measurable effect/);
  });

  it("only suggests airing the house when the cleanest window is clean enough", () => {
    const smoggyAllDay = advise({}, flat(260)).indoor.find((a) => a.id === "seal");
    expect(smoggyAllDay.impact).toMatch(/stays smoggy all day/);
    const cleanerEvening = advise({}, { curve: (hour) => (hour >= 17 ? 120 : 260) }).indoor.find(
      (a) => a.id === "seal",
    );
    expect(cleanerEvening.impact).toMatch(/Air the house briefly/);
    expect(cleanerEvening.impact).toMatch(/5 pm to 7 pm/);
  });
});

describe("greener choices and their impact", () => {
  const car = { commute: "car", commuteKm: 15 };

  it("quantifies a car-to-metro switch with the documented factors", () => {
    // 15 km x 2 x 5 days x (0.17 - 0.097) = 10.95 kg
    const action = advise(car).greener.find((a) => a.id === "g-car-to-transit");
    expect(action.impact).toMatch(/About 11 kg CO₂e less per week/);
    expect(action.impact).toMatch(/about 4.4 kg CO₂e if you start with 2 days/);
  });

  it("quantifies carpooling as half of the car's emissions", () => {
    // 150 km x 0.17 x 0.5 = 12.75 kg
    const action = advise(car).greener.find((a) => a.id === "g-carpool");
    expect(action.impact).toMatch(/About 13 kg CO₂e/);
  });

  it("does not claim a CO₂ saving from switching a scooter to public transport", () => {
    const greener = advise({ commute: "two_wheeler", commuteKm: 15 }).greener;
    expect(greener.map((a) => a.id)).not.toContain("g-car-to-transit");
    const fewer = greener.find((a) => a.id === "g-fewer-trips");
    expect(fewer.impact).toMatch(/About 1.5 kg CO₂e/);
  });

  it("offers walking or cycling for short motorised trips, only on clean-air days", () => {
    const short = { commute: "car", commuteKm: 3 };
    expect(ids(advise(short, flat(30)))).toContain("g-walk-cycle");
    expect(ids(advise(short, flat(250)))).not.toContain("g-walk-cycle");
  });

  it("always includes community and no-burning actions", () => {
    const greener = advise({}).greener.map((a) => a.id);
    expect(greener).toContain("g-no-burning");
    expect(greener).toContain("g-community");
  });
});

describe("plan integrity", () => {
  it("issues unique action ids with a title, a reason and an impact for each", () => {
    PERSONAS.forEach((p) => {
      const all = allActions(advise(p.profile));
      expect(new Set(all.map((a) => a.id)).size).toBe(all.length);
      all.forEach((a) => {
        expect(a.title.length).toBeGreaterThan(5);
        expect(a.why.length).toBeGreaterThan(10);
        expect(a.impact.length).toBeGreaterThan(10);
      });
    });
  });

  it("respects the limits on each list", () => {
    const advice = advise({
      groups: ["children", "seniors"],
      commute: "car",
      outdoorActivity: "kids_play",
      smokeSources: true,
      cookingFuel: "biomass",
    });
    expect(advice.routine.length).toBeLessThanOrEqual(6);
    expect(advice.indoor.length).toBeLessThanOrEqual(6);
    expect(advice.greener.length).toBeLessThanOrEqual(5);
  });

  it("is deterministic and never touches the network", () => {
    global.fetch = jest.fn();
    const first = advise(persona("delhi-family").profile);
    const second = advise(persona("delhi-family").profile);
    expect(second).toEqual(first);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("flags an old reading as stale and a fresh one as current", () => {
    const fresh = advise({});
    const old = advise({}, undefined, NOW_MS + 5 * 3600000);
    expect(fresh.reading.stale).toBe(false);
    expect(old.reading.stale).toBe(true);
  });

  it("still plans when there is no hourly forecast", () => {
    const air = makeAir();
    const advice = buildAdvice({
      air: { ...air, hourly: [] },
      place,
      profile: sanitizeProfile({ commute: "car" }),
      nowMs: NOW_MS,
    });
    expect(advice.slots).toEqual([]);
    expect(advice.bestWindow).toBeNull();
    expect(ids(advice)).not.toContain("timing");
    expect(advice.routine.length).toBeGreaterThan(0);
  });

  it("recomputes 1,500 plans in well under two seconds, so re-planning feels instant", () => {
    const air = makeAir();
    const start = performance.now();
    for (let i = 0; i < 1500; i += 1) {
      buildAdvice({ air, place, profile: PERSONAS[i % PERSONAS.length].profile, nowMs: NOW_MS });
    }
    expect(performance.now() - start).toBeLessThan(2000);
  });
});
