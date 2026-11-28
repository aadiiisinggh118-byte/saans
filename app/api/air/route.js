import { validateAirRequest } from "../../../lib/requests.js";
import { airService } from "../../../services/airService.js";
import { createApiHandler } from "../../../server/handleApi.js";

/** Runs on the Node.js runtime, not the edge, because it uses in-memory caches. */
export const runtime = "nodejs";

// The air service already caches readings briefly, so this route does not cache a second time.
/** `POST /api/air`: finds the place and returns its live air reading. */
export const POST = createApiHandler({
  name: "air",
  validate: validateAirRequest,
  run: (value) => airService.resolve(value),
  limit: 20,
  useCache: false,
});
