import { createAirService } from "../services/airService.js";
import { fetchAir, searchPlace } from "../services/openMeteo.js";
import { jsonResponse, makeAirJson, NOW_MS } from "./helpers/fixtures.js";

const geocodeJson = (lat = 28.54, lon = 77.39) => ({
  results: [
    { name: "Noida", admin1: "Uttar Pradesh", country_code: "IN", latitude: lat, longitude: lon },
  ],
});

/** A fake network that answers geocoding and air-quality calls and records every URL. */
function fakeNetwork({ geocode = geocodeJson() } = {}) {
  const urls = [];
  const fetchImpl = jest.fn(async (url) => {
    urls.push(String(url));
    return String(url).includes("geocoding-api")
      ? jsonResponse(geocode)
      : jsonResponse(makeAirJson());
  });
  return { fetchImpl, urls };
}

async function failure(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}

describe("searchPlace", () => {
  it("asks the geocoder for Indian places only and returns the first match", async () => {
    const { fetchImpl, urls } = fakeNetwork();
    const place = await searchPlace("Andheri Mumbai", { fetchImpl });
    const url = new URL(urls[0]);
    expect(url.host).toBe("geocoding-api.open-meteo.com");
    expect(url.searchParams.get("name")).toBe("Andheri Mumbai");
    expect(url.searchParams.get("countryCode")).toBe("IN");
    expect(place).toMatchObject({ name: "Noida", lat: 28.54, lon: 77.39 });
  });

  it("explains when a place cannot be found", async () => {
    const { fetchImpl } = fakeNetwork({ geocode: { results: [] } });
    const error = await failure(searchPlace("Atlantis", { fetchImpl }));
    expect(error.status).toBe(404);
    expect(error.message).toMatch(/couldn't find that place in India/);
  });
});

describe("fetchAir", () => {
  it("requests the current reading and a two-day hourly forecast in IST", async () => {
    const { fetchImpl, urls } = fakeNetwork();
    const air = await fetchAir(28.54, 77.39, { fetchImpl, now: () => NOW_MS });
    const url = new URL(urls[0]);
    expect(url.host).toBe("air-quality-api.open-meteo.com");
    expect(url.searchParams.get("latitude")).toBe("28.54");
    expect(url.searchParams.get("current")).toBe("us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone");
    expect(url.searchParams.get("hourly")).toBe("us_aqi,pm2_5");
    expect(url.searchParams.get("forecast_days")).toBe("2");
    expect(url.searchParams.get("timezone")).toBe("Asia/Kolkata");
    expect(air.usAqi).toBe(288);
    expect(air.fetchedAt).toBe(new Date(NOW_MS).toISOString());
  });

  it("turns an upstream error into a friendly message and keeps the detail for logs", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({}, 500));
    const error = await failure(fetchAir(1, 2, { fetchImpl }));
    expect(error.status).toBe(502);
    expect(error.message).toMatch(/couldn't reach the air-quality service/);
    expect(error.message).not.toMatch(/500/);
    expect(error.details).toMatch(/HTTP 500/);
  });

  it("does not leak a network error's text to the user", async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error("connect ECONNRESET 10.1.2.3:443");
    });
    const error = await failure(fetchAir(1, 2, { fetchImpl }));
    expect(error.message).not.toMatch(/ECONNRESET|10\.1\.2\.3/);
    expect(error.details).toMatch(/ECONNRESET/);
  });

  it("gives up on a hung request instead of waiting forever", async () => {
    const hang = (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () =>
          reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
        );
      });
    const error = await failure(fetchAir(1, 2, { fetchImpl: hang, timeoutMs: 20 }));
    expect(error.status).toBe(504);
    expect(error.message).toMatch(/took too long/);
  });

  it("refuses a response with no reading rather than inventing one", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ hourly: {} }));
    const error = await failure(fetchAir(1, 2, { fetchImpl }));
    expect(error.message).toMatch(/no reading/);
  });
});

describe("air service", () => {
  it("caches a reading for a place, so repeat checks make one upstream call", async () => {
    const { fetchImpl, urls } = fakeNetwork();
    const service = createAirService({ fetchImpl, now: () => NOW_MS });
    await service.resolve({ query: "Noida" });
    await service.resolve({ query: "Noida" });
    expect(urls.filter((u) => u.includes("air-quality-api"))).toHaveLength(1);
  });

  it("reads the air again once the cached reading is too old", async () => {
    const { fetchImpl, urls } = fakeNetwork();
    let clock = NOW_MS;
    const service = createAirService({ fetchImpl, now: () => clock, ttlMs: 60000 });
    await service.resolve({ query: "Noida" });
    clock += 61000;
    await service.resolve({ query: "Noida" });
    expect(urls.filter((u) => u.includes("air-quality-api"))).toHaveLength(2);
  });

  it("skips the geocoder when the browser already has coordinates", async () => {
    const { fetchImpl, urls } = fakeNetwork();
    const service = createAirService({ fetchImpl, now: () => NOW_MS });
    const { place } = await service.resolve({ lat: 19.07, lon: 72.87, name: "Mumbai" });
    expect(place).toMatchObject({ label: "Mumbai", lat: 19.07, lon: 72.87 });
    expect(urls.some((u) => u.includes("geocoding-api"))).toBe(false);
  });
});
