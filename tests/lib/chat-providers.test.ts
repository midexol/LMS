import { describe, it, expect, vi, beforeEach } from "vitest";

/* Fake OpenAI SDK: records how the client was built and what it was asked. */
const sdk = vi.hoisted(() => ({
  clients: [] as any[],
  requests: [] as any[],
  reply: '{"score": 8, "feedback": "Good."}',
  error: null as Error | null,
}));
vi.mock("openai", () => ({
  default: class {
    constructor(opts: any) {
      sdk.clients.push(opts);
    }
    chat = {
      completions: {
        create: async (req: any) => {
          sdk.requests.push(req);
          if (sdk.error) throw sdk.error;
          return { choices: [{ message: { content: sdk.reply } }] };
        },
      },
    };
  },
}));

import { gradeWithChatProvider, isChatProvider } from "@/lib/ai/chatProviders";

beforeEach(() => {
  sdk.clients = [];
  sdk.requests = [];
  sdk.reply = '{"score": 8, "feedback": "Good."}';
  sdk.error = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const grade = (provider: "groq" | "openrouter") => gradeWithChatProvider(provider, "Q?", "ref", "answer", 10, "k");

describe("Groq and OpenRouter grading", () => {
  it("recognises only the two providers", () => {
    expect(isChatProvider("groq")).toBe(true);
    expect(isChatProvider("openrouter")).toBe(true);
    expect(isChatProvider("gemini")).toBe(false);
  });

  it("points the OpenAI client at Groq and asks for JSON", async () => {
    await expect(grade("groq")).resolves.toEqual({ score: 8, feedback: "Good." });
    expect(sdk.clients[0]).toMatchObject({ apiKey: "k", baseURL: "https://api.groq.com/openai/v1" });
    expect(sdk.requests[0].model).toBe("llama-3.3-70b-versatile");
    expect(sdk.requests[0].response_format).toEqual({ type: "json_object" });
  });

  it("points the client at OpenRouter without forcing JSON mode", async () => {
    await grade("openrouter");
    expect(sdk.clients[0].baseURL).toBe("https://openrouter.ai/api/v1");
    expect(sdk.requests[0]).not.toHaveProperty("response_format");
  });

  it("keeps the student's answer out of the system message", async () => {
    await gradeWithChatProvider("groq", "Q?", "ref", "SECRET-ANSWER", 10, "k");
    const [system, user] = sdk.requests[0].messages;
    expect(system.role).toBe("system");
    expect(system.content).not.toContain("SECRET-ANSWER");
    expect(user.content).toContain("SECRET-ANSWER");
  });

  it("honours GROQ_MODEL and OPENROUTER_MODEL", async () => {
    vi.stubEnv("GROQ_MODEL", "my-groq-model");
    vi.stubEnv("OPENROUTER_MODEL", "vendor/my-model:free");
    await grade("groq");
    await grade("openrouter");
    expect(sdk.requests.map((r) => r.model)).toEqual(["my-groq-model", "vendor/my-model:free"]);
  });

  it("reads JSON out of code fences or surrounding text and clamps the score", async () => {
    sdk.reply = 'Sure!\n```json\n{"score": 99, "feedback": "Great"}\n```';
    await expect(grade("openrouter")).resolves.toEqual({ score: 10, feedback: "Great" });
  });

  it("throws when the reply has no JSON, so the dispatcher can fall back", async () => {
    sdk.reply = "I cannot grade this.";
    await expect(grade("groq")).rejects.toThrow(/JSON/);
  });

  it("propagates API errors", async () => {
    sdk.error = new Error("429 rate limited");
    await expect(grade("groq")).rejects.toThrow(/429/);
  });
});
