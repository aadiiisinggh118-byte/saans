import { useEffect, useMemo, useState } from "react";
import { postJson } from "../client/api.js";
import { IDLE } from "./useAirReading.js";

const IDLE_AI = { ...IDLE, forProfile: "" };

/**
 * Asks Gemini (through `/api/advice`) to explain the plan, and clears the old explanation
 * whenever a new place is being checked.
 * @param {{ place?: { lat: number, lon: number, label: string }, profile: import("../lib/profile.js").Profile, airStatus: string }} input
 */
export function useGeminiExplanation({ place, profile, airStatus }) {
  const [ai, setAi] = useState(IDLE_AI);
  const [language, setLanguage] = useState("en");
  const [question, setQuestion] = useState("");

  useEffect(() => {
    if (airStatus === "loading") setAi(IDLE_AI);
  }, [airStatus]);

  const explanations = useMemo(() => {
    const map = new Map();
    if (ai.status === "ready") {
      ai.data.narration.actions.forEach((a) => map.set(a.id, a.explanation));
    }
    return map;
  }, [ai]);

  async function askGemini() {
    const forProfile = JSON.stringify(profile);
    setAi({ ...IDLE_AI, status: "loading", forProfile });
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

  const outdated = ai.status === "ready" && ai.forProfile !== JSON.stringify(profile);

  return { ai, explanations, outdated, language, setLanguage, question, setQuestion, askGemini };
}
