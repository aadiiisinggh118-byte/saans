import { runAdvice } from "../../../ai/advice.js";
import { buildAdvice } from "../../../lib/rules.js";
import { validateAdviceRequest } from "../../../lib/requests.js";
import { airService } from "../../../services/airService.js";
import { createApiHandler } from "../../../server/handleApi.js";

export const runtime = "nodejs";
// A Gemini call can take several seconds (and a retry doubles that), so don't rely on the host's default limit.
export const maxDuration = 60;

/**
 * The server re-reads the air quality itself and rebuilds the plan with the same pure rules
 * the browser uses, so the model only ever explains data this server trusts.
 */
async function run({ lat, lon, name, profile, language, question }) {
  const { place, air } = await airService.resolve({ lat, lon, name });
  const advice = buildAdvice({ air, place, profile, nowMs: Date.now() });
  const narration = await runAdvice({ advice, profile, language, question });
  return { narration, basedOn: { usAqi: air.usAqi, dataTime: air.dataTime }, language };
}

export const POST = createApiHandler({
  name: "advice",
  validate: validateAdviceRequest,
  run,
  limit: 8,
});
