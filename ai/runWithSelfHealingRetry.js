import { ServiceError } from "../lib/errors.js";
import { callGemini } from "./callGemini.js";

/**
 * Calls Gemini, parses its JSON and validates it. If validation fails, the errors are fed
 * back for exactly ONE retry. So a request costs one model call, and never more than two.
 * If the second answer is also invalid we fail safely rather than show something unchecked.
 * @template T
 * @param {{ buildPrompt: (feedback?: string) => { systemInstruction: string, prompt: string }, validate: (parsed: unknown) => { valid: boolean, errors: string[], value?: T }, callOptions?: object }} options
 * @returns {Promise<T>}
 */
export async function runWithSelfHealingRetry({ buildPrompt, validate, callOptions = {} }) {
  const attemptOnce = async (feedback) => {
    const { systemInstruction, prompt } = buildPrompt(feedback);
    const raw = await callGemini({ systemInstruction, prompt, ...callOptions });
    let parsed;
    // JSON mode normally returns bare JSON; tolerate a stray ```json fence just in case.
    try {
      parsed = JSON.parse(
        String(raw)
          .trim()
          .replace(/^```(?:json)?\s*|\s*```$/g, ""),
      );
    } catch {
      return { ok: false, errors: ["Response was not valid JSON."] };
    }
    const { valid, errors, value } = validate(parsed);
    return valid ? { ok: true, data: value ?? parsed } : { ok: false, errors };
  };

  const first = await attemptOnce();
  if (first.ok) return first.data;
  const second = await attemptOnce(first.errors.join("; "));
  if (second.ok) return second.data;

  throw new ServiceError(
    "The AI answer didn't pass our checks, so we're not showing it. Your plan above is unaffected.",
    502,
    second.errors.join("; ").slice(0, 400),
  );
}
