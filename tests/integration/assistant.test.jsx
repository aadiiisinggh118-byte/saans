/** @jest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AssistantApp from "../../components/AssistantApp.jsx";
import { jsonResponse } from "../helpers/fixtures.js";
import { airBody, bodyOf, mockApi, narrationBody } from "../helpers/mockApi.js";

jest.setTimeout(15000);

beforeEach(() => {
  window.localStorage.clear();
});

const checkDelhi = async (user) => {
  await user.click(screen.getByRole("button", { name: "Delhi" }));
  await screen.findByRole("heading", { name: /air right now in delhi/i });
};

describe("checking the air", () => {
  it("starts by asking for a place and makes no request until you do", () => {
    const fetchMock = mockApi();
    render(<AssistantApp />);
    expect(screen.getByText(/pick a city above/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads the live air for a quick-choice city and shows the source and time", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi();
    render(<AssistantApp />);
    await checkDelhi(user);
    expect(bodyOf(fetchMock, "/api/air")).toEqual({ query: "Delhi" });
    expect(screen.getByText("288")).toBeInTheDocument();
    expect(screen.getAllByText(/very unhealthy/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /open-meteo air quality api/i })).toHaveAttribute(
      "href",
      expect.stringContaining("open-meteo.com"),
    );
    expect(screen.getByText(/reading for .* ist/i)).toBeInTheDocument();
    expect(screen.getByText(/modelled estimate/i)).toBeInTheDocument();
  });

  it("checks a typed place when the form is submitted", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi();
    render(<AssistantApp />);
    await user.type(screen.getByLabelText(/your city or area in india/i), "Noida");
    await user.click(screen.getByRole("button", { name: /check the air now/i }));
    await screen.findByRole("heading", { name: /air right now/i });
    expect(bodyOf(fetchMock, "/api/air")).toEqual({ query: "Noida" });
  });

  it("shows the whole plan: day plan, routine, indoor and greener choices", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<AssistantApp />);
    await checkDelhi(user);
    expect(screen.getByRole("heading", { name: /when to go out/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /your routine today/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /cleaner air at home/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /greener choices/i })).toBeInTheDocument();
    expect(screen.getAllByText(/what it changes:/i).length).toBeGreaterThan(3);
  });

  it("asks for a place instead of sending an empty request", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi();
    render(<AssistantApp />);
    await user.click(screen.getByRole("button", { name: /check the air now/i }));
    expect(await screen.findByText(/enter a city or area in india/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the server's explanation when a place is not found", async () => {
    const user = userEvent.setup();
    mockApi({
      air: jsonResponse({ error: "We couldn't find that place in India. Try a nearby city." }, 404),
    });
    render(<AssistantApp />);
    await checkDelhi(user).catch(() => {});
    expect(await screen.findByText(/couldn't find that place in india/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /air right now/i })).not.toBeInTheDocument();
  });

  it("explains a network failure in plain words", async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(async () => {
      throw new Error("offline");
    });
    render(<AssistantApp />);
    await user.click(screen.getByRole("button", { name: "Mumbai" }));
    expect(await screen.findByText(/couldn't reach the server/i)).toBeInTheDocument();
  });

  it("flags a reading that is too old", async () => {
    const user = userEvent.setup();
    const body = airBody();
    body.air.dataTimeMs -= 5 * 3600000;
    mockApi({ air: jsonResponse(body) });
    render(<AssistantApp />);
    await checkDelhi(user);
    expect(screen.getByRole("alert")).toHaveTextContent(/this reading is .* old|hours ago/i);
  });
});

describe("re-planning when the household changes", () => {
  it("updates the advice instantly, with no new network request", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi();
    render(<AssistantApp />);
    await checkDelhi(user);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("heading", { name: /move play indoors today/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/children \(under 12\)/i));
    await user.selectOptions(
      screen.getByLabelText(/what do you or your family do outdoors/i),
      "kids_play",
    );

    expect(screen.getByRole("heading", { name: /move play indoors today/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives a different plan for a different commute", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<AssistantApp />);
    await checkDelhi(user);
    await user.selectOptions(screen.getByLabelText(/get to work or school/i), "car");
    expect(screen.getByRole("heading", { name: /keep car windows up/i })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/get to work or school/i), "two_wheeler");
    expect(screen.queryByRole("heading", { name: /keep car windows up/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /take the metro or bus for long trips/i }),
    ).toBeInTheDocument();
  });

  it("only asks for a distance when there is a commute", async () => {
    const user = userEvent.setup();
    render(<AssistantApp />);
    expect(screen.queryByLabelText(/how far is it/i)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/get to work or school/i), "car");
    expect(screen.getByLabelText(/how far is it/i)).toBeInTheDocument();
  });
});

describe("sample households", () => {
  it("fills in the answers and checks the live air for that city in one click", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi();
    render(<AssistantApp />);
    await user.click(screen.getByRole("button", { name: /delhi family with two kids/i }));
    await screen.findByRole("heading", { name: /air right now/i });
    expect(bodyOf(fetchMock, "/api/air")).toEqual({ query: "Delhi" });
    expect(screen.getByLabelText(/children \(under 12\)/i)).toBeChecked();
    expect(screen.getByLabelText(/get to work or school/i)).toHaveValue("car");
    expect(screen.getByRole("heading", { name: /move play indoors today/i })).toBeInTheDocument();
  });
});

describe("remembering the household", () => {
  it("restores answers after a reload, from this browser only", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AssistantApp />);
    await user.click(screen.getByLabelText(/seniors \(65 or older\)/i));
    unmount();
    render(<AssistantApp />);
    await waitFor(() => expect(screen.getByLabelText(/seniors \(65 or older\)/i)).toBeChecked());
  });

  it("ignores tampered storage instead of crashing", async () => {
    window.localStorage.setItem(
      "saans.household.v1",
      JSON.stringify({ profile: { groups: ["wizards"], commute: "rocket" }, query: 42 }),
    );
    render(<AssistantApp />);
    await waitFor(() =>
      expect(screen.getByLabelText(/get to work or school/i)).toHaveValue("none"),
    );
    expect(screen.getByLabelText(/children \(under 12\)/i)).not.toBeChecked();
  });
});

describe("Gemini explanations", () => {
  const ask = async (user) => {
    await user.click(screen.getByRole("button", { name: /explain with gemini/i }));
  };

  it("sends the household and place, and shows the explanation under each action", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi();
    render(<AssistantApp />);
    await checkDelhi(user);
    await user.click(screen.getByLabelText(/seniors \(65 or older\)/i));
    await user.type(screen.getByLabelText(/a question \(optional\)/i), "Can I walk at 7 am?");
    await ask(user);

    expect(await screen.findByText(/stay in today and keep the windows shut/i)).toBeInTheDocument();
    expect(screen.getByText(/better after sunset/i)).toBeInTheDocument();
    expect(screen.getByText(/keep the windows shut through the smoggy hours/i)).toBeInTheDocument();

    const sent = bodyOf(fetchMock, "/api/advice");
    expect(sent).toMatchObject({
      lat: 28.65,
      lon: 77.23,
      language: "en",
      question: "Can I walk at 7 am?",
    });
    expect(sent.profile.groups).toEqual(["seniors"]);
    expect(sent.air).toBeUndefined(); // the server reads the air itself
  });

  it("asks for Hindi when chosen", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi();
    render(<AssistantApp />);
    await checkDelhi(user);
    await user.selectOptions(screen.getByLabelText(/explain in/i), "hi");
    await ask(user);
    await screen.findByText(/stay in today/i);
    expect(bodyOf(fetchMock, "/api/advice").language).toBe("hi");
  });

  it("warns when the household changed after the explanation was written", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<AssistantApp />);
    await checkDelhi(user);
    await ask(user);
    await screen.findByText(/stay in today/i);
    expect(screen.queryByText(/you changed your household answers/i)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/children \(under 12\)/i));
    expect(screen.getByText(/you changed your household answers/i)).toBeInTheDocument();
  });

  it("keeps the plan and says so when Gemini is unavailable", async () => {
    const user = userEvent.setup();
    mockApi({
      advice: jsonResponse({ error: "The AI service is busy. Please try again in a minute." }, 429),
    });
    render(<AssistantApp />);
    await checkDelhi(user);
    await ask(user);
    expect(await screen.findByText(/the ai service is busy/i)).toBeInTheDocument();
    expect(screen.getByText(/your plan above is still correct/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /your routine today/i })).toBeInTheDocument();
  });

  it("clears an old explanation when you check a new place", async () => {
    const user = userEvent.setup();
    mockApi({ advice: jsonResponse(narrationBody()) });
    render(<AssistantApp />);
    await checkDelhi(user);
    await ask(user);
    await screen.findByText(/stay in today/i);
    await user.click(screen.getByRole("button", { name: "Delhi" }));
    await waitFor(() => expect(screen.queryByText(/stay in today/i)).not.toBeInTheDocument());
  });
});
