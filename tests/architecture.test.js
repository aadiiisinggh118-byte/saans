// These tests protect the design, not a feature: code decides, the AI only explains.
import fs from "node:fs";
import path from "node:path";
import { allActions, buildAdvice } from "../lib/rules.js";
import { PERSONAS } from "../lib/personas.js";
import { makeAir, NOW_MS } from "./helpers/fixtures.js";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
/** Source with comments removed, so a comment that mentions `fetch` is not mistaken for a call. */
const code = (file) =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const list = (dir, pattern) =>
  fs
    .readdirSync(path.join(root, dir))
    .filter((name) => pattern.test(name))
    .map((name) => `${dir}/${name}`);

const lib = list("lib", /\.js$/);
const sources = [
  ...lib,
  ...list("services", /\.js$/),
  ...list("ai", /\.js$/),
  ...list("server", /\.js$/),
  ...list("components", /\.jsx?$/),
  ...list("hooks", /\.js$/),
  ...list("client", /\.js$/),
  "app/layout.jsx",
  "app/page.jsx",
  "app/assistant/page.jsx",
  "app/api/air/route.js",
  "app/api/advice/route.js",
];

describe("the deterministic core stays pure", () => {
  it.each(lib)("%s makes no network calls and reads no secrets", (file) => {
    const src = code(file);
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/process\.env/);
  });

  it.each(lib)("%s does not import the network, AI or server layers", (file) => {
    expect(code(file)).not.toMatch(/from ["']\.\.\/(services|ai|server)\//);
    expect(code(file)).not.toMatch(/from ["'](next|react)/);
  });

  it("re-planning for every sample household never touches the network", () => {
    global.fetch = jest.fn();
    const air = makeAir();
    PERSONAS.forEach((p) => {
      const advice = buildAdvice({ air, place: { label: "X" }, profile: p.profile, nowMs: NOW_MS });
      expect(allActions(advice).length).toBeGreaterThan(0);
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("one consistent module style", () => {
  it.each(sources)("%s uses ES modules only", (file) => {
    expect(code(file)).not.toMatch(/\brequire\s*\(/);
    expect(code(file)).not.toMatch(/module\.exports/);
  });

  it("every exported function in the engine, service and AI layers has a JSDoc comment", () => {
    const files = [
      ...lib,
      ...list("services", /\.js$/),
      ...list("ai", /\.js$/),
      ...list("server", /\.js$/),
    ];
    files.forEach((file) => {
      const src = read(file);
      const exported = src.match(/^export (async )?function /gm) || [];
      const documented = src.match(/\*\/\n\s*export (async )?function /g) || [];
      expect({ file, undocumented: exported.length - documented.length }).toEqual({
        file,
        undocumented: 0,
      });
    });
  });

  it("no source file leaves debugging output behind", () => {
    sources.forEach((file) => expect(code(file)).not.toMatch(/console\.log/));
  });
});

describe("secrets and the AI boundary", () => {
  it("only the Gemini client and the log redactor ever reference the API key", () => {
    const offenders = sources.filter((file) => /GEMINI_API_KEY/.test(code(file)));
    expect(offenders.sort()).toEqual(["ai/callGemini.js", "server/handleApi.js"]);
  });

  it("the API key is never placed in a URL", () => {
    expect(code("ai/callGemini.js")).not.toMatch(/[?&]key=/);
  });

  it("every Gemini request is plain text in, JSON out: no tool or function declarations", () => {
    expect(code("ai/callGemini.js")).not.toMatch(/\btools\s*:|functionDeclarations|toolConfig/);
  });

  it("the browser never imports server, service or AI code", () => {
    const client = [
      ...list("components", /\.jsx?$/),
      ...list("hooks", /\.js$/),
      ...list("client", /\.js$/),
      "app/layout.jsx",
      "app/page.jsx",
      "app/assistant/page.jsx",
    ];
    client.forEach((file) => {
      expect(code(file)).not.toMatch(/from ["'](\.\.\/)+(ai|server|services)\//);
      expect(code(file)).not.toMatch(/handleApi|callGemini|validateAI/);
    });
  });

  it("only three small modules call fetch: the Gemini client, the browser's API helper and the air service", () => {
    const callers = sources.filter((file) => /\bfetch\s*\(/.test(code(file)));
    expect(callers.sort()).toEqual(["ai/callGemini.js", "client/api.js", "services/airService.js"]);
  });

  it("only the Gemini client, the air-data client and the link constants name an external host", () => {
    const external = sources.filter((file) => /https?:\/\//.test(code(file)));
    expect(external.sort()).toEqual([
      "ai/callGemini.js",
      "lib/constants.js",
      "services/openMeteo.js",
    ]);
  });
});

describe("a small, bounded AI footprint", () => {
  it("has exactly two API routes, and only one of them uses Gemini", () => {
    expect(fs.readdirSync(path.join(root, "app/api")).sort()).toEqual(["advice", "air"]);
    expect(code("app/api/advice/route.js")).toMatch(/runAdvice/);
    expect(code("app/api/air/route.js")).not.toMatch(/ai\//);
  });

  it("has a single place that calls the model, and it makes at most two calls", () => {
    const callers = list("ai", /\.js$/).filter(
      (file) => /callGemini\(/.test(code(file)) && file !== "ai/callGemini.js",
    );
    expect(callers).toEqual(["ai/runWithSelfHealingRetry.js"]);
    // The first attempt and the one corrective retry: no loop, so never a third call.
    expect((code("ai/runWithSelfHealingRetry.js").match(/attemptOnce\(/g) || []).length).toBe(2);
  });

  it("ships with no runtime dependencies beyond the framework", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["next", "react", "react-dom"]);
  });
});

describe("repository hygiene", () => {
  it(".gitignore protects secrets without hiding .env.example", () => {
    const lines = read(".gitignore")
      .split("\n")
      .map((line) => line.trim());
    [".env", ".env.local", ".env.*.local", "node_modules", ".next"].forEach((entry) =>
      expect(lines).toContain(entry),
    );
    expect(lines).not.toContain(".env*");
    expect(fs.existsSync(path.join(root, ".env.example"))).toBe(true);
  });

  it("no real-looking API key appears anywhere in the source or docs", () => {
    const files = [...sources, ".env.example", "README.md"].filter((f) =>
      fs.existsSync(path.join(root, f)),
    );
    files.forEach((file) => expect(read(file)).not.toMatch(/AIza[0-9A-Za-z_-]{30,}/));
  });

  it("has lint, format and test tooling configured", () => {
    const pkg = JSON.parse(read("package.json"));
    ["lint", "format", "test"].forEach((script) => expect(pkg.scripts[script]).toBeDefined());
    ["eslint.config.mjs", ".prettierrc.json", ".editorconfig"].forEach((file) =>
      expect(fs.existsSync(path.join(root, file))).toBe(true),
    );
  });
});
