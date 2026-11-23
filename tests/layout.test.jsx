// Node environment on purpose: react-dom/server needs it.
import { renderToStaticMarkup } from "react-dom/server";
import AssistantPage from "../app/assistant/page.jsx";
import RootLayout, { metadata } from "../app/layout.jsx";
import Home from "../app/page.jsx";

describe("root layout", () => {
  const html = renderToStaticMarkup(
    <RootLayout>
      <p>hello</p>
    </RootLayout>,
  );

  it("declares the language, a skip link that targets the main landmark, and exactly one main", () => {
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('href="#main"');
    expect(html.match(/<main id="main"/g)).toHaveLength(1);
    expect(html).toContain("<header");
    expect(html).toContain("<footer");
    expect(html).toContain("hello");
  });

  it("sets a descriptive page title and description", () => {
    expect(metadata.title).toMatch(/Saans/);
    expect(metadata.description.length).toBeGreaterThan(40);
  });

  it("tells people the data is modelled and the advice is not medical advice", () => {
    expect(html).toMatch(/modelled estimates/);
    expect(html).toMatch(/not medical advice/);
  });
});

describe("pages", () => {
  it("the landing page has one h1, a call to action and the three areas of the brief", () => {
    const page = renderToStaticMarkup(<Home />);
    expect(page.match(/<h1/g)).toHaveLength(1);
    expect(page).toContain('href="/assistant"');
    expect(page).toMatch(/Low-emission daily routines/);
    expect(page).toMatch(/Cleaner air at home/);
    expect(page).toMatch(/Greener alternatives/);
  });

  it("the assistant page has one h1 and the household form", () => {
    const page = renderToStaticMarkup(<AssistantPage />);
    expect(page.match(/<h1/g)).toHaveLength(1);
    expect(page).toMatch(/Your air, your day/);
    expect(page).toMatch(/Who lives in your home/);
    expect(page).toMatch(/Delhi family with two kids/);
  });
});
