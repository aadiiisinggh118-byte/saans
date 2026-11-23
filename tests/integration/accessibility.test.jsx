/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import Footer from "../../components/Footer.jsx";
import Header from "../../components/Header.jsx";
import AssistantApp from "../../components/AssistantApp.jsx";
import Home from "../../app/page.jsx";
import { jsonResponse } from "../helpers/fixtures.js";
import { mockApi } from "../helpers/mockApi.js";

expect.extend(toHaveNoViolations);
// axe walks the whole DOM; the first run in jsdom is slow, so allow generous time.
jest.setTimeout(30000);

const audit = async (container) => expect(await axe(container)).toHaveNoViolations();

/** A stand-in for the real layout: landmarks and the one h1 a real page has. */
function Page({ children }) {
  return (
    <>
      <Header />
      <main>
        <h1>Page title</h1>
        {children}
      </main>
      <Footer />
    </>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("axe audit: pages", () => {
  it("landing page", async () => {
    const { container } = render(
      <>
        <Header />
        <main>
          <Home />
        </main>
        <Footer />
      </>,
    );
    await audit(container);
  });

  it("assistant, before anything is checked", async () => {
    mockApi();
    const { container } = render(
      <Page>
        <AssistantApp />
      </Page>,
    );
    await audit(container);
  });
});

describe("axe audit: states that appear after the user acts", () => {
  it("assistant with a live reading and a full plan", async () => {
    const user = userEvent.setup();
    mockApi();
    const { container } = render(
      <Page>
        <AssistantApp />
      </Page>,
    );
    await user.click(screen.getByRole("button", { name: /delhi family with two kids/i }));
    await screen.findByRole("heading", { name: /air right now/i });
    await audit(container);
  });

  it("the plan for a sensitive household with every optional answer filled in", async () => {
    const user = userEvent.setup();
    mockApi();
    const { container } = render(
      <Page>
        <AssistantApp />
      </Page>,
    );
    await user.click(screen.getByRole("button", { name: /kolkata grandparents/i }));
    await screen.findByRole("heading", { name: /air right now/i });
    await audit(container);
  });

  it("Gemini's explanation, under the actions", async () => {
    const user = userEvent.setup();
    mockApi();
    const { container } = render(
      <Page>
        <AssistantApp />
      </Page>,
    );
    await user.click(screen.getByRole("button", { name: "Delhi" }));
    await screen.findByRole("heading", { name: /air right now/i });
    await user.click(screen.getByRole("button", { name: /explain with gemini/i }));
    await screen.findByText(/stay in today/i);
    await audit(container);
  });

  it("an error from the air service", async () => {
    const user = userEvent.setup();
    mockApi({ air: jsonResponse({ error: "We couldn't find that place in India." }, 404) });
    const { container } = render(
      <Page>
        <AssistantApp />
      </Page>,
    );
    await user.click(screen.getByRole("button", { name: "Delhi" }));
    await screen.findByText(/couldn't find that place/i);
    await audit(container);
  });

  it("an error from Gemini", async () => {
    const user = userEvent.setup();
    mockApi({ advice: jsonResponse({ error: "The AI service is busy." }, 429) });
    const { container } = render(
      <Page>
        <AssistantApp />
      </Page>,
    );
    await user.click(screen.getByRole("button", { name: "Delhi" }));
    await screen.findByRole("heading", { name: /air right now/i });
    await user.click(screen.getByRole("button", { name: /explain with gemini/i }));
    await screen.findByText(/the ai service is busy/i);
    await audit(container);
  });
});
