import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini model names get retired often, and new API keys may be refused older models.
 * Instead of hard-wiring one name, try GEMINI_MODEL first (if set), then these current models in order,
 * and remember whichever one works so later requests skip the failures.
 */
const DEFAULT_CANDIDATES = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"];

export function getGeminiModelCandidates(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  return configured
    ? [configured, ...DEFAULT_CANDIDATES.filter((m) => m !== configured)]
    : DEFAULT_CANDIDATES;
}

/** True for "this model does not exist / is retired / you may not use it" errors, not for rate limits or outages. */
function isModelUnavailable(err: unknown): boolean {
  const message = String((err as { message?: unknown })?.message ?? err).toLowerCase();
  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("no longer available") ||
    message.includes("is not supported") ||
    message.includes("limiting access")
  );
}

/**
 * True when this model is rate limited or overloaded right now (429 / 503). Each Gemini model has its own quota,
 * so another model may well answer; the model is not broken, so it is not forgotten.
 */
function isBusy(err: unknown): boolean {
  const message = String((err as { message?: unknown })?.message ?? err).toLowerCase();
  return (
    message.includes("429") ||
    message.includes("503") ||
    message.includes("quota") ||
    message.includes("too many requests") ||
    message.includes("overloaded") ||
    message.includes("unavailable")
  );
}

let workingModel: string | null = null;

export async function generateWithGemini(
  apiKey: string,
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const all = getGeminiModelCandidates();
  const candidates = workingModel ? [workingModel, ...all.filter((m) => m !== workingModel)] : all;

  let lastError: unknown;
  for (const name of candidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: name,
        ...(systemInstruction ? { systemInstruction } : {}),
      });
      const result = await model.generateContent(prompt);
      if (workingModel !== name) {
        console.info(`[AI] Using Gemini model ${name}`);
        workingModel = name;
      }
      return result.response.text();
    } catch (err) {
      lastError = err;
      const gone = isModelUnavailable(err);
      if (!gone && !isBusy(err)) throw err;
      console.warn(`[AI] Gemini model ${name} is ${gone ? "unavailable" : "busy or rate limited"}, trying the next one.`);
      if (gone && workingModel === name) workingModel = null;
    }
  }
  throw lastError;
}
