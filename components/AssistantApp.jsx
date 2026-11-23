"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_PROFILE, sanitizeProfile } from "../lib/profile.js";
import { buildAdvice } from "../lib/rules.js";
import { EMISSION_SOURCES } from "../lib/constants.js";
import ActionSection from "./ActionSection.jsx";
import AiPanel from "./AiPanel.jsx";
import AirCard from "./AirCard.jsx";
import DayPlan from "./DayPlan.jsx";
import LocationForm from "./LocationForm.jsx";
import PersonaPicker from "./PersonaPicker.jsx";
import ProfileForm from "./ProfileForm.jsx";
import { postJson } from "./api.js";
import { readSaved, writeSaved } from "./storage.js";
import { Notice, Panel } from "./ui.jsx";

const IDLE = { status: "idle", data: null, error: "" };
const MINUTE_MS = 60000;

/**
 * The whole assistant. Only two things use the network: reading the air (`/api/air`) and
 * asking Gemini to explain (`/api/advice`). Everything else, including re-planning when the
 * household answers change, is computed instantly in the browser by pure functions.
 */
export default function AssistantApp() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [query, setQuery] = useState("");
  const [air, setAir] = useState(IDLE);
  const [ai, setAi] = useState({ ...IDLE, forProfile: "" });
  const [language, setLanguage] = useState("en");
  const [question, setQuestion] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);

  // Restore the household and place from this browser, re-validated because storage is untrusted.
  useEffect(() => {
    const saved = readSaved();
    if (saved) {
      setProfile(sanitizeProfile(saved.profile));
      if (typeof saved.query === "string") setQuery(saved.query.slice(0, 80));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeSaved({ profile, query });
  }, [ready, profile, query]);

  // Keep "how old is this reading" and the remaining hours of the day fresh.
  useEffect(() => {
    if (air.status !== "ready") return undefined;
    const timer = setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => clearInterval(timer);
  }, [air.status]);

  const advice = useMemo(
    () =>
      air.status === "ready"
        ? buildAdvice({ air: air.data.air, place: air.data.place, profile, nowMs: now })
        : null,
    [air, profile, now],
  );

  const explanations = useMemo(() => {
    const map = new Map();
    if (ai.status === "ready") {
      ai.data.narration.actions.forEach((a) => map.set(a.id, a.explanation));
    }
    return map;
  }, [ai]);

  async function checkAir(text) {
    const place = text.trim();
    setQuery(text);
    if (place.length < 2) {
      setAir({
        status: "error",
        data: null,
        error: "Enter a city or area in India, for example Noida.",
      });
      return;
    }
    setAir({ status: "loading", data: null, error: "" });
    setAi({ ...IDLE, forProfile: "" });
    try {
      const data = await postJson("/api/air", { query: place });
      setNow(Date.now());
      setAir({ status: "ready", data, error: "" });
    } catch (error) {
      setAir({ status: "error", data: null, error: error.message });
    }
  }

  function pickPersona(persona) {
    setProfile(sanitizeProfile(persona.profile));
    checkAir(persona.place);
  }

  async function askGemini() {
    const { place } = air.data;
    const forProfile = JSON.stringify(profile);
    setAi({ ...IDLE, status: "loading", forProfile });
    try {
      const data = await postJson("/api/advice", {
        lat: place.lat,
        lon: place.lon,
        name: place.label,
        profile,
        language,
        question,
      });
      setAi({ status: "ready", data, error: "", forProfile });
    } catch (error) {
      setAi({ status: "error", data: null, error: error.message, forProfile });
    }
  }

  const loading = air.status === "loading";

  return (
    <div className="space-y-6">
      <Panel aria-labelledby="where-heading">
        <h2 id="where-heading" className="mb-3 text-xl">
          1. Where are you?
        </h2>
        <LocationForm
          query={query}
          onQueryChange={setQuery}
          onSubmit={checkAir}
          loading={loading}
          error={air.status === "error" ? air.error : ""}
        />
        <p role="status" className="mt-3 text-sm text-ink-soft">
          {loading ? "Reading today's air quality…" : ""}
        </p>
      </Panel>

      <Panel aria-labelledby="household-heading">
        <h2 id="household-heading" className="mb-1 text-xl">
          2. Tell us about your household
        </h2>
        <p className="mb-4 max-w-prose text-ink-soft">
          Two families in the same city need different advice. Change any answer and the plan
          updates straight away, with no waiting.
        </p>
        <ProfileForm profile={profile} onChange={setProfile} />
      </Panel>

      <Panel aria-labelledby="sample-heading">
        <h2 id="sample-heading" className="mb-1 text-xl">
          Or try a sample household
        </h2>
        <p className="mb-4 max-w-prose text-ink-soft">
          One click fills in the answers and checks the live air for that city.
        </p>
        <PersonaPicker onPick={pickPersona} disabled={loading} />
      </Panel>

      {advice && (
        <>
          <AirCard advice={advice} />
          <DayPlan advice={advice} />
          <ActionSection
            id="routine"
            title="Your routine today"
            intro="Low-emission, low-exposure choices for how your household moves and plays."
            actions={advice.routine}
            explanations={explanations}
          />
          <ActionSection
            id="indoor"
            title="Cleaner air at home"
            intro="What to do indoors, based on your home and today's outdoor air."
            actions={advice.indoor}
            explanations={explanations}
          />
          <ActionSection
            id="greener"
            title="Greener choices"
            intro="Sustainable alternatives, with the effect each one has."
            actions={advice.greener}
            explanations={explanations}
          />
          <p className="max-w-prose text-sm text-ink-soft">
            CO₂ figures are estimates from average Indian emission factors (WRI India):{" "}
            {EMISSION_SOURCES.map((source, i) => (
              <span key={source.url}>
                {i > 0 && "; "}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-teal underline"
                >
                  {source.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </span>
            ))}
            .
          </p>
          <AiPanel
            ai={ai}
            outdated={ai.status === "ready" && ai.forProfile !== JSON.stringify(profile)}
            language={language}
            onLanguage={setLanguage}
            question={question}
            onQuestion={setQuestion}
            onAsk={askGemini}
          />
        </>
      )}

      {air.status === "idle" && (
        <Notice tone="info">
          Pick a city above to see the live air quality and your household&apos;s plan.
        </Notice>
      )}
    </div>
  );
}
