// Shared building block for every rule: the shape of one piece of advice.

/**
 * @typedef {object} Action
 * @property {string} id stable identifier; the AI may only refer to ids issued here
 * @property {"routine" | "indoor" | "greener"} area
 * @property {number} priority lower comes first
 * @property {string} title what to do
 * @property {string} why the reason, in terms of today's data and this household
 * @property {string} impact the direct effect of doing it
 */

export const action = (id, area, priority, title, why, impact) => ({
  id,
  area,
  priority,
  title,
  why,
  impact,
});
