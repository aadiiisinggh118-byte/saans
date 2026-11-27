import { useEffect, useState } from "react";
import { postJson } from "../client/api.js";

const MINUTE_MS = 60000;
const MIN_PLACE_LENGTH = 2;

/** The starting state of any request this screen makes. */
export const IDLE = { status: "idle", data: null, error: "" };

/**
 * Reads the live air for a place through `/api/air`, and keeps "now" fresh so the age of the
 * reading and the hours left in the day stay correct while the page is open.
 * @param {{ onCheck?: (text: string) => void }} [options] called when a new check starts
 * @returns {{ air: typeof IDLE, now: number, checkAir: (text: string) => Promise<void> }}
 */
export function useAirReading({ onCheck } = {}) {
  const [air, setAir] = useState(IDLE);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (air.status !== "ready") return undefined;
    const timer = setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => clearInterval(timer);
  }, [air.status]);

  async function checkAir(text) {
    const place = text.trim();
    if (onCheck) onCheck(text);
    if (place.length < MIN_PLACE_LENGTH) {
      setAir({
        status: "error",
        data: null,
        error: "Enter a city or area in India, for example Noida.",
      });
      return;
    }
    setAir({ status: "loading", data: null, error: "" });
    try {
      const data = await postJson("/api/air", { query: place });
      setNow(Date.now());
      setAir({ status: "ready", data, error: "" });
    } catch (error) {
      setAir({ status: "error", data: null, error: error.message });
    }
  }

  return { air, now, checkAir };
}
