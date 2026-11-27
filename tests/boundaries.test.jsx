// Node environment on purpose: react-dom/server needs it.
import { renderToStaticMarkup } from "react-dom/server";
import ErrorPage from "../app/error.jsx";
import Loading from "../app/loading.jsx";
import NotFound from "../app/not-found.jsx";

describe("error, loading and not-found pages", () => {
  it("the error page has one heading and a retry button", () => {
    const html = renderToStaticMarkup(<ErrorPage reset={() => {}} />);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toMatch(/Something went wrong/);
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>Try again<\/button>/);
  });

  it("the loading page announces itself politely", () => {
    const html = renderToStaticMarkup(<Loading />);
    expect(html).toContain('role="status"');
    expect(html).toMatch(/Loading/);
  });

  it("the not-found page has one heading and a way back to the assistant", () => {
    const html = renderToStaticMarkup(<NotFound />);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('href="/assistant"');
  });
});
