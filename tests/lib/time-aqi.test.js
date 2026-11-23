import { assessFreshness, bandForAqi, bandIndexForAqi, verdictFor } from "../../lib/aqi.js";
import { addDays, formatClock, formatHour, istParts, parseLocalIst } from "../../lib/time.js";
import { NOW_MS } from "../helpers/fixtures.js";

describe("IST time helpers", () => {
  it("parses Open-Meteo local timestamps as IST", () => {
    expect(parseLocalIst("2026-11-22T08:00")).toBe(Date.UTC(2026, 10, 22, 2, 30));
  });

  it.each([["garbage"], ["2026-13-01T08:00"], ["2026-11-22T24:00"], [null], [12]])(
    "rejects an invalid timestamp: %s",
    (value) => {
      expect(parseLocalIst(value)).toBeNull();
    },
  );

  it("splits an instant into the IST date and clock time", () => {
    expect(istParts(NOW_MS)).toEqual({ date: "2026-11-22", hour: 8, minute: 15 });
  });

  it("rolls the date over at IST midnight, not UTC midnight", () => {
    expect(istParts(Date.UTC(2026, 10, 22, 19, 0)).date).toBe("2026-11-23");
  });

  it("adds and subtracts days across month ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it.each([
    [0, "12 am"],
    [6, "6 am"],
    [12, "12 pm"],
    [22, "10 pm"],
    [24, "12 am"],
  ])("formats hour %s as %s", (hour, text) => {
    expect(formatHour(hour)).toBe(text);
  });

  it("formats a clock time", () => {
    expect(formatClock(NOW_MS)).toBe("8:15 am");
  });
});

describe("AQI bands", () => {
  it.each([
    [0, 0],
    [50, 0],
    [51, 1],
    [100, 1],
    [101, 2],
    [150, 2],
    [151, 3],
    [200, 3],
    [201, 4],
    [300, 4],
    [301, 5],
    [500, 5],
    [650, 5],
  ])("puts AQI %s in band %s", (aqi, index) => {
    expect(bandIndexForAqi(aqi)).toBe(index);
  });

  it("returns no band for a missing reading", () => {
    expect(bandIndexForAqi(NaN)).toBe(-1);
    expect(bandForAqi(NaN)).toBeNull();
  });

  it("returns the band label and tone", () => {
    expect(bandForAqi(288)).toMatchObject({ label: "Very unhealthy", tone: "bad", index: 4 });
  });
});

describe("household verdict", () => {
  it.each([
    [0, false, "ok"],
    [2, false, "ok"],
    [3, false, "limit"],
    [4, false, "avoid"],
    [5, false, "avoid"],
    [1, true, "ok"],
    [2, true, "limit"],
    [3, true, "avoid"],
  ])("band %s, sensitive %s gives %s", (band, sensitive, verdict) => {
    expect(verdictFor(band, sensitive)).toBe(verdict);
  });

  it("is never more relaxed for a sensitive household than for anyone else", () => {
    const rank = { ok: 0, limit: 1, avoid: 2 };
    for (let band = 0; band <= 5; band += 1) {
      expect(rank[verdictFor(band, true)]).toBeGreaterThanOrEqual(rank[verdictFor(band, false)]);
    }
  });
});

describe("freshness", () => {
  it("reports the age of a reading in minutes", () => {
    const result = assessFreshness(NOW_MS - 45 * 60000, NOW_MS);
    expect(result).toEqual({ ageMinutes: 45, stale: false });
  });

  it("marks a reading older than three hours as stale", () => {
    expect(assessFreshness(NOW_MS - 181 * 60000, NOW_MS).stale).toBe(true);
    expect(assessFreshness(NOW_MS - 180 * 60000, NOW_MS).stale).toBe(false);
  });

  it("never reports a negative age", () => {
    expect(assessFreshness(NOW_MS + 60000, NOW_MS).ageMinutes).toBe(0);
  });
});
