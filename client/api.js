/**
 * @typedef {{ name: string, label: string, lat: number, lon: number }} Place
 * @typedef {{ place: Place, air: import("../lib/air.js").AirReport }} AirResponse the answer of `/api/air`
 * @typedef {{ narration: { headline: string, answer: string, actions: { id: string, explanation: string }[] }, basedOn: { usAqi: number, dataTime: string }, language: string }} AdviceResponse
 *   the answer of `/api/advice`
 */

/**
 * POSTs JSON to one of this app's own routes and returns the parsed answer.
 * Throws an Error whose message is safe to show to the user.
 * @param {string} url
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>} the parsed JSON; callers cast it to the shape their route returns
 */
export async function postJson(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("We couldn't reach the server. Check your connection and try again.");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok)
    throw new Error((data && data.error) || "Something went wrong. Please try again.");
  if (!data) throw new Error("The server sent an answer we couldn't read. Please try again.");
  return data;
}
