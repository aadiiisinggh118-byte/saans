// Server-side only. The key is read from the environment, sent in a header
// (never in the URL, where it would end up in logs), and never returned.
// The request carries NO tool or function declarations: code gathers every fact first,
// so each call is a small, plain text-in, JSON-out request.

import { ServiceError } from "../lib/errors.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * One JSON-mode generateContent call with a hard timeout and one retry on 429/5xx.
 * @param {{ systemInstruction: string, prompt: string, maxOutputTokens?: number, temperature?: number, timeoutMs?: number }} options
 * @returns {Promise<string>} the model's raw JSON text
 */
export async function callGemini({
  systemInstruction,
  prompt,
  maxOutputTokens = 2400,
  temperature = 0.4,
  timeoutMs = 25000,
}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ServiceError("The AI service isn't configured on this server yet.", 503);
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const generationConfig = { responseMimeType: "application/json", maxOutputTokens, temperature };
  // These are short, structured rewrites: skip the model's optional "thinking" for speed and cost.
  if (/gemini-2\.5-flash/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
  });

  const attempt = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${BASE}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body,
        signal: controller.signal,
      });
      if (!response.ok) {
        const message =
          response.status === 429
            ? "The AI service is busy. Please try again in a minute."
            : "The AI service couldn't answer. Please try again.";
        const detail = (await response.text?.().catch(() => "")) ?? "";
        const error = new ServiceError(
          message,
          response.status,
          `Gemini HTTP ${response.status} (${model}): ${detail.slice(0, 300)}`,
        );
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text)
        throw new ServiceError("The AI service returned an empty answer. Please try again.");
      return text;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new ServiceError("The AI service took too long. Please try again.", 504);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await attempt();
  } catch (error) {
    if (!error.retryable) throw error;
    await new Promise((resolve) => setTimeout(resolve, 800));
    return attempt();
  }
}
