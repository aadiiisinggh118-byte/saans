import { POST as advicePost } from "../app/api/advice/route.js";
import { POST as airPost } from "../app/api/air/route.js";
import { jsonResponse, makeAirJson } from "./helpers/fixtures.js";

const originalConsoleError = console.error;
let ipCounter = 0;
const nextIp = () => `10.0.0.${(ipCounter += 1)}`;

const post = (handler, body, { ip = nextIp(), path = "air" } = {}) =>
  handler(
    new Request(`http://localhost/api/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const geocode = (lat, lon) => ({
  results: [{ name: "Testville", admin1: "UP", country_code: "IN", latitude: lat, longitude: lon }],
});

/** Answers geocoding, air-quality and Gemini calls, and records them. */
function installNetwork({ lat = 28.5, lon = 77.4, gemini } = {}) {
  const calls = { air: 0, gemini: 0, geocode: 0 };
  global.fetch = jest.fn(async (url, init) => {
    const target = String(url);
    if (target.includes("geocoding-api")) {
      calls.geocode += 1;
      return jsonResponse(geocode(lat, lon));
    }
    if (target.includes("air-quality-api")) {
      calls.air += 1;
      return jsonResponse(makeAirJson());
    }
    calls.gemini += 1;
    if (gemini) return gemini(init);
    const text = JSON.parse(init.body).contents[0].parts[0].text;
    const data = JSON.parse(text.split("<household_data>\n")[1].split("\n</household_data>")[0]);
    return jsonResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  headline: "The air is very unhealthy today.",
                  actions: data.actions.map((a) => ({ id: a.id, explanation: "Fits your home." })),
                  answer: data.question ? "Go out after 6 pm, briefly." : "",
                }),
              },
            ],
          },
        },
      ],
    });
  });
  return calls;
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key-123";
  console.error = () => {};
});
afterEach(() => {
  console.error = originalConsoleError;
});

describe("POST /api/air", () => {
  it("returns the place and a live reading, never cached by browsers", async () => {
    installNetwork({ lat: 21.1, lon: 79.1 });
    const response = await post(airPost, { query: "Nagpur" });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.place).toMatchObject({ lat: 21.1, lon: 79.1 });
    expect(body.air.usAqi).toBe(288);
    expect(body.air.source.name).toMatch(/Open-Meteo/);
  });

  it("reads a place's air once, however many people ask", async () => {
    const calls = installNetwork({ lat: 22.2, lon: 73.2 });
    await post(airPost, { query: "Vadodara" });
    await post(airPost, { query: "Vadodara" });
    expect(calls.air).toBe(1);
  });

  it("rejects a bad request with a helpful message", async () => {
    installNetwork();
    const response = await post(airPost, {});
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/city or area in India/);
  });

  it("rejects text that is not JSON", async () => {
    const response = await post(airPost, "{not json");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/valid JSON/);
  });

  it("rejects an oversized body", async () => {
    const response = await post(airPost, `{"query":"${"a".repeat(9000)}"}`);
    expect(response.status).toBe(413);
  });

  it("explains an unknown place", async () => {
    global.fetch = jest.fn(async () => jsonResponse({ results: [] }));
    const response = await post(airPost, { query: "Atlantis" });
    expect(response.status).toBe(404);
    expect((await response.json()).error).toMatch(/couldn't find that place/);
  });

  it("hides upstream failures behind a friendly message", async () => {
    global.fetch = jest.fn(async () => jsonResponse({}, 503));
    const response = await post(airPost, { lat: 12.9, lon: 77.5 });
    const body = await response.json();
    expect(response.status).toBe(502);
    expect(body.error).toMatch(/try again/);
    expect(JSON.stringify(body)).not.toMatch(/503|open-meteo/i);
  });

  it("rate limits a caller who asks too often, and says when to retry", async () => {
    installNetwork({ lat: 30.7, lon: 76.7 });
    const ip = "192.168.9.9";
    let last;
    for (let i = 0; i < 21; i += 1) last = await post(airPost, { query: "Chandigarh" }, { ip });
    expect(last.status).toBe(429);
    expect(Number(last.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("POST /api/advice", () => {
  // Each test uses its own coordinates, so the route's response cache never leaks between tests.
  let step = 0;
  const makeRequest = (extra = {}) => ({
    lat: 20 + (step += 1) * 0.05,
    lon: 75,
    name: "Delhi",
    profile: { groups: ["children"], commute: "car" },
    ...extra,
  });

  it("reads the air itself, rebuilds the plan and has Gemini explain it", async () => {
    const calls = installNetwork();
    const response = await post(advicePost, makeRequest(), { path: "advice" });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(calls.air).toBe(1);
    expect(calls.gemini).toBe(1);
    expect(body.narration.headline).toMatch(/unhealthy/);
    expect(body.narration.actions.length).toBeGreaterThan(5);
    expect(body.basedOn.usAqi).toBe(288);
  });

  it("never trusts air readings sent by the browser", async () => {
    installNetwork();
    let facts;
    const original = global.fetch;
    global.fetch = jest.fn(async (url, init) => {
      if (String(url).includes("generativelanguage")) {
        const text = JSON.parse(init.body).contents[0].parts[0].text;
        facts = JSON.parse(text.split("<household_data>\n")[1].split("\n</household_data>")[0]);
      }
      return original(url, init);
    });
    await post(advicePost, makeRequest({ air: { usAqi: 5 }, usAqi: 5 }), { path: "advice" });
    expect(facts.reading.usAqi).toBe(288);
  });

  it("sends the key to Google in a header and never back to the browser", async () => {
    installNetwork();
    const response = await post(advicePost, makeRequest(), { path: "advice" });
    const text = await response.text();
    expect(text).not.toMatch(/test-key-123/);
    const geminiCall = global.fetch.mock.calls.find((c) =>
      String(c[0]).includes("generativelanguage"),
    );
    expect(String(geminiCall[0])).not.toMatch(/test-key-123/);
    expect(geminiCall[1].headers["x-goog-api-key"]).toBe("test-key-123");
  });

  it("answers an identical request from its cache without calling Gemini again", async () => {
    const calls = installNetwork();
    const same = makeRequest({ question: "Can I jog at 7 am?" });
    await post(advicePost, same, { path: "advice" });
    const again = await post(advicePost, same, { path: "advice" });
    expect(calls.gemini).toBe(1);
    expect((await again.json()).cached).toBe(true);
  });

  it("fails safely when Gemini's answer keeps failing the checks, leaking no detail", async () => {
    const calls = installNetwork({
      gemini: async () =>
        jsonResponse({ candidates: [{ content: { parts: [{ text: '{"headline":"x"}' }] } }] }),
    });
    const response = await post(advicePost, makeRequest(), { path: "advice" });
    const body = await response.json();
    expect(response.status).toBe(502);
    expect(body.error).toMatch(/didn't pass our checks/);
    expect(JSON.stringify(body)).not.toMatch(/actions|details/);
    expect(calls.gemini).toBe(2);
  });

  it("says so plainly when the server has no Gemini key", async () => {
    installNetwork();
    delete process.env.GEMINI_API_KEY;
    const response = await post(advicePost, makeRequest(), { path: "advice" });
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/isn't configured/);
  });

  it("rejects coordinates outside India", async () => {
    installNetwork();
    const response = await post(advicePost, { lat: 51.5, lon: -0.1 }, { path: "advice" });
    expect(response.status).toBe(400);
  });
});
