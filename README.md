# Saans: Urban Air Quality Assistant

Saans ("breath" in Hindi) helps families in India get through severe winter smog. Pick any city or area in India, tell it who lives in your home and how you get around, and it builds a plan for today: when to go out, what to change in your routine, how to keep indoor air cleaner, and which greener choices actually lower your emissions, with the size of each effect.

## Why this is not "just a chatbot"

A chatbot can invent an AQI, a threshold or an emissions saving, and sound sure. Saans splits the work:

- **Code decides.** The air reading comes from a live data service. Every verdict, threshold, time window and number of kilograms of CO₂e comes from plain, unit-tested functions in `lib/`.
- **Gemini explains.** Gemini only rewrites the plan in warm, plain language (English or Hindi) and answers one optional question. It cannot add actions or numbers. Its output is checked before you see it (see "GenAI usage").

If Gemini is down, the full plan still works.

## Brief requirement → where it lives

| Requirement from the brief              | Feature                                                                                       | Evidence                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Real-time AQI from a reliable source    | Open-Meteo Air Quality API (CAMS model, US AQI, hourly 2-day forecast)                        | `services/openMeteo.js`, `lib/air.js`                  |
| Show source and timestamp               | Source link, data time (IST), staleness notice on the air card                                | `components/AirCard.jsx`, `lib/aqi.js`                 |
| All of India, user-selectable location  | Place search filtered to India, quick-pick cities                                             | `services/openMeteo.js`, `components/LocationForm.jsx` |
| Personalised by household and lifestyle | Children, seniors, respiratory, pregnancy; commute, distance, outdoor activity, cooking, home | `lib/profile.js`, `lib/rules/`                         |
| Low-emission daily routines             | Best 2-hour window, worst hour, routine actions                                               | `lib/planner.js`, `lib/rules/routineRules.js`          |
| Indoor air hacks                        | Sealing, purifier, cooking, dust, and an honest note on plants                                | `lib/rules/indoorRules.js`                             |
| Sustainable alternatives                | Transit, carpool, walk/cycle, fewer trips, no idling or burning                               | `lib/rules/greenerRules.js`                            |
| Explain the impact of choices           | kg CO₂e per week using WRI India factors, with sources                                        | `lib/impact.js`, `lib/constants.js`                    |
| Sample inputs for the evaluator         | Five ready households, one click each                                                         | `lib/personas.js`, `components/PersonaPicker.jsx`      |

## Evaluation criteria → evidence

| Criterion         | What we did                                                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code quality      | Pure logic separated from I/O; one ESM style; JSDoc on every export; small single-purpose modules (rules split by area); ESLint 9 and Prettier configs; CI workflow; MIT licence; constants in one file |
| Security          | Strict CSP (`connect-src 'self'`), security headers, API key only server-side and sent in a header, input validation, body-size cap, rate limiting, server re-fetches air itself                        |
| Efficiency        | One AI route, one Gemini call (two at most), no tool declarations, 10-minute air cache, profile changes re-plan with no network call                                                                    |
| Testing           | Unit tests for every `lib/` module, service, AI and route tests, jsdom flows, axe audits, architecture rules (`tests/`)                                                                                 |
| Accessibility     | Skip link, landmarks, one h1 per page, labelled controls, AA colour contrast (tested in `tests/colorContrast.test.js`), axe checks on every state                                                       |
| Problem alignment | See the requirement table above                                                                                                                                                                         |

## GenAI usage

- Exactly one AI route: `/api/advice`. One Gemini call, plus one corrective retry only if validation fails. No function or tool declarations.
- The server re-fetches the air itself; it never trusts readings sent by the browser.
- The prompt receives the code-built plan as data. Gemini returns a headline, an answer, and one explanation per action id.
- Validation (`lib/validateAI.js`): only action ids issued by code, each once; any AQI or PM figure must exist in the data; no medicine or dosage words; length caps; no answer unless a question was asked.
- **What AI did:** wrote the explanations and helped build the code. **What a human did:** chose the problem approach, rules and thresholds, reviewed and tested everything.

## Architecture

```text
Browser (Next.js, React)
  |
  |-- POST /api/air -----> validate -> Open-Meteo geocoding + air quality
  |                         -> normalise -> 10-minute cache -> reading
  |
  '-- POST /api/advice --> validate -> re-fetch air on the server
                            -> buildAdvice (pure rules, no network)
                            -> ONE Gemini call (explanations only)
                            -> validate the reply (ids, numbers, wording)
                            -> narration  (or plan only, if checks fail)
```

| Folder        | Role                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------- |
| `lib/`        | Pure logic with no I/O: verdicts, planner, impact maths, request and AI-reply validators |
| `lib/rules/`  | The advice rules, split into `routineRules`, `indoorRules` and `greenerRules`            |
| `services/`   | Open-Meteo calls                                                                         |
| `ai/`         | The single Gemini call, prompt building and the corrective retry                         |
| `server/`     | Shared API handler: rate limit, body-size cap, safe errors                               |
| `app/`        | Pages, error / loading / not-found pages and the two API routes                          |
| `components/` | The interface: presentational React components                                           |
| `hooks/`      | React hooks for state: the household, the air reading, the Gemini explanation            |
| `client/`     | Browser-side helpers: the API client and local storage                                   |
| `tests/`      | Unit, service, route, accessibility and architecture tests                               |

CI (`.github/workflows/ci.yml`) runs format check, lint, tests and a production build on every push.

## Assumptions and limits

- The air figures are **modelled estimates** (CAMS via Open-Meteo) on the **US AQI scale**, not readings from a street-level monitor. The app says so on screen.
- Sensitive households (children, seniors, respiratory conditions, pregnancy) are advised one band earlier.
- Emission factors: car 0.17, public transport 0.097, two-wheeler 0.0516 kg CO₂e per passenger-km (WRI India). No saving is claimed for moving from a two-wheeler to transit.
- Rate limiting is in memory per server instance.
- This is general guidance, not medical advice.

## Sample inputs

Use the five households on the assistant page: Delhi family with two kids, Mumbai commuter, Kolkata grandparents, Noida metro commuter, Patna family. Or type any Indian city or area.

## Run it

```
npm install
copy .env.example .env.local     # then set GEMINI_API_KEY
npm run dev                      # http://localhost:3000
npm run check                    # format check, lint, tests
npm run build
npm run typecheck                # type-checks the JavaScript using its JSDoc types
npm run smoke:live               # live Open-Meteo check, no key needed
```

Deploy on Vercel and set `GEMINI_API_KEY` (optionally `GEMINI_MODEL`).
