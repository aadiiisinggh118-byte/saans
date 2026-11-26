import { useEffect, useState } from "react";
import { DEFAULT_PROFILE, sanitizeProfile } from "../lib/profile.js";
import { readSaved, writeSaved } from "./storage.js";

const MAX_QUERY_LENGTH = 80;

/**
 * The household answers and the place text, remembered in this browser only. Anything read
 * back from storage is re-validated first, because storage can be edited by anyone.
 * @returns {{ profile: import("../lib/profile.js").Profile, setProfile: Function, query: string, setQuery: Function }}
 */
export function useHousehold() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = readSaved();
    if (saved) {
      setProfile(sanitizeProfile(saved.profile));
      if (typeof saved.query === "string") setQuery(saved.query.slice(0, MAX_QUERY_LENGTH));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeSaved({ profile, query });
  }, [ready, profile, query]);

  return { profile, setProfile, query, setQuery };
}
