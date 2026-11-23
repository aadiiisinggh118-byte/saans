// Every colour pairing the interface uses is checked here, so contrast is computed, not eyeballed.
import { contrastRatio, meetsAA } from "../lib/colorContrast.js";
import tailwind from "../tailwind.config.mjs";

const c = tailwind.theme.extend.colors;
const WHITE = "#FFFFFF";
const PLACEHOLDER = "#5F7378"; // set in app/globals.css

const TEXT_PAIRS = [
  ["body text on page", c.ink.DEFAULT, c.ground],
  ["body text on panels", c.ink.DEFAULT, c.surface],
  ["secondary text on panels", c.ink.soft, c.surface],
  ["secondary text on page", c.ink.soft, c.ground],
  ["primary button", WHITE, c.teal.DEFAULT],
  ["primary button hover", WHITE, c.teal.mid],
  ["accent button", c.ink.DEFAULT, c.amber.DEFAULT],
  ["accent button hover", c.ink.DEFAULT, c.amber.light],
  ["header and dark section", c["on-dark"], c.teal.dark],
  ["white heading on dark section", WHITE, c.teal.dark],
  ["links on panels", c.teal.DEFAULT, c.surface],
  ["ghost button text", c.teal.DEFAULT, c.surface],
  ["ghost button hover", c.teal.DEFAULT, c.info.bg],
  ["good badge", c.ok.DEFAULT, c.ok.bg],
  ["caution badge", c.warn.DEFAULT, c.warn.bg],
  ["danger badge", c.bad.DEFAULT, c.bad.bg],
  ["info badge and notices", c.info.DEFAULT, c.info.bg],
  ["error text on panels", c.bad.DEFAULT, c.surface],
  ["placeholder text", PLACEHOLDER, WHITE],
];

describe("colour contrast (WCAG AA)", () => {
  it.each(TEXT_PAIRS)("%s meets 4.5:1", (_name, foreground, background) => {
    const ratio = contrastRatio(foreground, background);
    expect(meetsAA(ratio)).toBe(true);
  });

  it("input borders meet the 3:1 non-text minimum against white", () => {
    expect(meetsAA(contrastRatio(c.edge, WHITE), "large")).toBe(true);
  });
});
