/**
 * POSTs JSON to one of this app's own routes and returns the parsed answer.
 * Throws an Error whose message is safe to show to the user.
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
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
