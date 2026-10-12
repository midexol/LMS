import OpenAI from "openai";
import { buildGradingSystemPrompt, buildGradingUserPrompt } from "./gradingPrompt";

/**
 * Groq and OpenRouter both speak the OpenAI chat API, so the same SDK talks to them by changing the base URL.
 * Groq is fast with a free tier; OpenRouter is one key that reaches many models.
 */
export type ChatProviderName = "groq" | "openrouter";

interface ChatProviderConfig {
  baseURL: string;
  keyEnv: string;
  modelEnv: string;
  defaultModel: string;
  /** Not every OpenRouter model supports forced JSON mode, so that one relies on the prompt and tolerant parsing. */
  jsonMode: boolean;
}

export const CHAT_PROVIDERS: Record<ChatProviderName, ChatProviderConfig> = {
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    keyEnv: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
    jsonMode: true,
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    keyEnv: "OPENROUTER_API_KEY",
    modelEnv: "OPENROUTER_MODEL",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    jsonMode: false,
  },
};

export function isChatProvider(name: string): name is ChatProviderName {
  return name === "groq" || name === "openrouter";
}

/** Pulls the JSON object out of a reply that may be wrapped in code fences or surrounding text. */
function parseJsonObject(text: string): { score?: unknown; feedback?: unknown } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("The model did not return a JSON object.");
  return JSON.parse(text.slice(start, end + 1));
}

export async function gradeWithChatProvider(
  provider: ChatProviderName,
  assignmentPrompt: string,
  referenceAnswer: string,
  studentAnswer: string,
  maxScore: number,
  apiKey: string
): Promise<{ score: number; feedback: string }> {
  const config = CHAT_PROVIDERS[provider];
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: config.baseURL,
      ...(provider === "openrouter" && process.env.NEXT_PUBLIC_APP_URL
        ? { defaultHeaders: { "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL, "X-Title": "Academia LMS" } }
        : {}),
    });

    const response = await client.chat.completions.create({
      model: process.env[config.modelEnv]?.trim() || config.defaultModel,
      messages: [
        { role: "system", content: buildGradingSystemPrompt(maxScore) },
        { role: "user", content: buildGradingUserPrompt(assignmentPrompt, referenceAnswer, studentAnswer, maxScore) },
      ],
      ...(config.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    });

    const parsed = parseJsonObject(response.choices[0]?.message?.content || "");
    return {
      score: Math.min(maxScore, Math.max(0, Math.round(Number(parsed.score) || 0))),
      feedback: String(parsed.feedback || "Submission evaluated."),
    };
  } catch (error) {
    console.error(`[AI GRADINGS ERROR - ${provider.toUpperCase()}]`, error);
    throw error;
  }
}
