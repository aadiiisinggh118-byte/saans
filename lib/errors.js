/**
 * An error whose message is safe to show to the user. Anything that is not a
 * ServiceError is replaced by a generic message before it leaves the server.
 */
export class ServiceError extends Error {
  /**
   * @param {string} message user-safe text
   * @param {number} [status] HTTP status to respond with
   * @param {string} [details] extra text for server logs only, never sent to the browser
   */
  constructor(message, status = 502, details = "") {
    super(message);
    this.name = "ServiceError";
    this.expose = true;
    this.status = status;
    this.details = details;
  }
}
