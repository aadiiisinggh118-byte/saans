"use client";

import { useMemo } from "react";
import { sanitizeProfile } from "../lib/profile.js";
import { buildAdvice } from "../lib/rules.js";
import ActionSection from "./ActionSection.jsx";
import AiPanel from "./AiPanel.jsx";
import AirCard from "./AirCard.jsx";
import DayPlan from "./DayPlan.jsx";
import EmissionSources from "./EmissionSources.jsx";
import LocationForm from "./LocationForm.jsx";
import PersonaPicker from "./PersonaPicker.jsx";
import ProfileForm from "./ProfileForm.jsx";
import { useAirReading } from "../hooks/useAirReading.js";
import { useGeminiExplanation } from "../hooks/useGeminiExplanation.js";
import { useHousehold } from "../hooks/useHousehold.js";
import { Notice, Panel } from "./ui.jsx";

/**
 * The whole assistant. Only two things use the network: reading the air (`/api/air`) and
 * asking Gemini to explain (`/api/advice`). Everything else, including re-planning when the
 * household answers change, is computed instantly in the browser by pure functions.
 */
export default function AssistantApp() {
  const { profile, setProfile, query, setQuery } = useHousehold();
  const { air, now, checkAir } = useAirReading({ onCheck: setQuery });
  const gemini = useGeminiExplanation({
    place: air.data?.place,
    profile,
    airStatus: air.status,
  });

  const advice = useMemo(
    () =>
      air.status === "ready"
        ? buildAdvice({ air: air.data.air, place: air.data.place, profile, nowMs: now })
        : null,
    [air, profile, now],
  );

  function pickPersona(persona) {
    setProfile(sanitizeProfile(persona.profile));
    checkAir(persona.place);
  }

  const loading = air.status === "loading";
  const { explanations } = gemini;

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
          <EmissionSources />
          <AiPanel
            ai={gemini.ai}
            outdated={gemini.outdated}
            language={gemini.language}
            onLanguage={gemini.setLanguage}
            question={gemini.question}
            onQuestion={gemini.setQuestion}
            onAsk={gemini.askGemini}
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
