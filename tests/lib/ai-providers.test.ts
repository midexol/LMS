import { describe, it, expect, vi, beforeEach } from "vitest";

/* Fake SDKs: tests control exactly what "Google" and "OpenAI" answer. */
const gemini = vi.hoisted(() => ({
  calls: [] as Array<{ model: string; systemInstruction?: string; prompt: string }>,
  handler: (_model: string): string => "{}",
}));
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel(opts: { model: string; systemInstruction?: string }) {
      return {
        generateContent: async (prompt: string) => {
          gemini.calls.push({ model: opts.model, systemInstruction: opts.systemInstruction, prompt });
          const text = gemini.handler(opts.model);
          return { response: { text: () => text } };
        },
      };
    }
  },
}));

const openai = vi.hoisted(() => ({
  requests: [] as any[],
  reply: "{}",
  error: null as Error | null,
}));
vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: async (req: any) => {
          openai.requests.push(req);
          if (openai.error) throw openai.error;
          return { choices: [{ message: { content: openai.reply } }] };
        },
      },
    };
  },
}));

async function fresh() {
  vi.resetModules();
  return {
    models: await import("@/lib/ai/geminiModels"),
    grader: await import("@/lib/ai/gemini"),
    assistant: await import("@/lib/ai/assistant"),
    openaiGrader: await import("@/lib/ai/openai"),
  };
}

const modelError = (name: string) => new Error(`[404 Not Found] models/${name} is not found for API version v1beta`);

beforeEach(() => {
  gemini.calls = [];
  gemini.handler = () => "{}";
  openai.requests = [];
  openai.reply = "{}";
  openai.error = null;
});

describe("Gemini model fallback (geminiModels)", () => {
  it("uses the first current model when it works", async () => {
    const { models } = await fresh();
    gemini.handler = () => "hello";
    expect(await models.generateWithGemini("key", "prompt")).toBe("hello");
    expect(gemini.calls.map((c) => c.model)).toEqual(["gemini-3.8-flash"]);
  });

  it("moves to the next model when one is retired or unavailable (404)", async () => {
    const { models } = await fresh();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    gemini.handler = (model) => {
      if (model === "gemini-3.8-flash") throw modelError(model);
      return "from-second";
    };
    expect(await models.generateWithGemini("key", "p")).toBe("from-second");
    expect(gemini.calls.map((c) => c.model)).toEqual(["gemini-3.8-flash", "gemini-3.5-flash-lite"]);
  });

  it("also falls back on 'limiting access' errors for restricted keys", async () => {
    const { models } = await fresh();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    gemini.handler = (model) => {
      if (model !== "gemini-2.5-flash") throw new Error("We are limiting access to this model");
      return "ok";
    };
    expect(await models.generateWithGemini("key", "p")).toBe("ok");
    expect(gemini.calls).toHaveLength(3);
  });

  it("remembers the model that worked and tries it first next time", async () => {
    const { models } = await fresh();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    gemini.handler = (model) => {
      if (model === "gemini-3.8-flash") throw modelError(model);
      return "ok";
    };
    await models.generateWithGemini("key", "p");
    gemini.calls = [];
    await models.generateWithGemini("key", "p");
    expect(gemini.calls.map((c) => c.model)).toEqual(["gemini-3.5-flash-lite"]);
  });

  it("does NOT fall back on rate limits or outages: those errors surface immediately", async () => {
    const { models } = await fresh();
    gemini.handler = () => {
      throw new Error("[429 Too Many Requests] quota exceeded");
    };
    await expect(models.generateWithGemini("key", "p")).rejects.toThrow(/429/);
    expect(gemini.calls).toHaveLength(1);
  });

  it("throws the last error when every model is unavailable", async () => {
    const { models } = await fresh();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    gemini.handler = (model) => {
      throw modelError(model);
    };
    await expect(models.generateWithGemini("key", "p")).rejects.toThrow(/gemini-2\.5-flash/);
    expect(gemini.calls).toHaveLength(3);
  });

  it("tries GEMINI_MODEL first, without duplicating it", async () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    const { models } = await fresh();
    expect(models.getGeminiModelCandidates()).toEqual(["gemini-2.5-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite"]);
    vi.stubEnv("GEMINI_MODEL", "my-custom-model");
    expect(models.getGeminiModelCandidates()[0]).toBe("my-custom-model");
  });

  it("passes the system instruction through", async () => {
    const { models } = await fresh();
    gemini.handler = () => "x";
    await models.generateWithGemini("key", "the prompt", "be strict");
    expect(gemini.calls[0]).toMatchObject({ prompt: "the prompt", systemInstruction: "be strict" });
  });
});

describe("Gemini grader (gradeWithGemini)", () => {
  const grade = async (reply: string, max = 100) => {
    const { grader } = await fresh();
    gemini.handler = () => reply;
    return grader.gradeWithGemini("Q?", "reference", "answer", max, "key");
  };

  it("parses a plain JSON reply", async () => {
    expect(await grade('{"score": 85, "feedback": "Well done"}')).toEqual({ score: 85, feedback: "Well done" });
  });

  it("parses JSON wrapped in markdown code fences", async () => {
    expect(await grade('```json\n{"score": 72, "feedback": "Fine"}\n```')).toEqual({ score: 72, feedback: "Fine" });
  });

  it("rounds fractional scores", async () => {
    expect((await grade('{"score": 84.6, "feedback": "x"}')).score).toBe(85);
  });

  it("clamps scores above the maximum and below zero", async () => {
    expect((await grade('{"score": 150, "feedback": "x"}', 100)).score).toBe(100);
    expect((await grade('{"score": 9, "feedback": "x"}', 5)).score).toBe(5);
    expect((await grade('{"score": -20, "feedback": "x"}')).score).toBe(0);
  });

  it("treats a non-numeric score as 0 and accepts numeric strings", async () => {
    expect((await grade('{"score": "great", "feedback": "x"}')).score).toBe(0);
    expect((await grade('{"score": "90", "feedback": "x"}')).score).toBe(90);
    expect((await grade('{"feedback": "x"}')).score).toBe(0);
  });

  it("supplies default feedback when the model omits it", async () => {
    expect((await grade('{"score": 50}')).feedback).toBe("Submission evaluated.");
  });

  it("throws on unparseable output so the caller can fall back", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(grade("Sorry, I cannot grade this.")).rejects.toThrow();
  });

  it("sends the rubric-aware system prompt and the fenced answer", async () => {
    const { grader } = await fresh();
    gemini.handler = () => '{"score":1,"feedback":"x"}';
    await grader.gradeWithGemini("Q?", "REFERENCE TEXT", "STUDENT TEXT", 30, "key");
    expect(gemini.calls[0].systemInstruction).toContain("between 0 and 30");
    expect(gemini.calls[0].prompt).toContain("REFERENCE TEXT");
    expect(gemini.calls[0].prompt).toMatch(/<student_submission>\nSTUDENT TEXT\n<\/student_submission>/);
  });
});

describe("OpenAI grader (gradeWithOpenAI)", () => {
  const grade = async (reply: string, max = 100) => {
    const { openaiGrader } = await fresh();
    openai.reply = reply;
    return openaiGrader.gradeWithOpenAI("Q?", "reference", "answer", max, "key");
  };

  it("parses the JSON reply and clamps the score", async () => {
    expect(await grade('{"score": 77, "feedback": "Good"}')).toEqual({ score: 77, feedback: "Good" });
    expect((await grade('{"score": 999, "feedback": "x"}', 100)).score).toBe(100);
    expect((await grade('{"score": -1, "feedback": "x"}')).score).toBe(0);
  });

  it("requests JSON output with separate system and user messages (student text never in the system role)", async () => {
    const { openaiGrader } = await fresh();
    openai.reply = '{"score": 1, "feedback": "x"}';
    await openaiGrader.gradeWithOpenAI("Q?", "reference", "UNIQUE-STUDENT-TEXT-123", 100, "key");
    const req = openai.requests[0];
    expect(req.model).toBe("gpt-4o-mini");
    expect(req.response_format).toEqual({ type: "json_object" });
    expect(req.messages.map((m: any) => m.role)).toEqual(["system", "user"]);
    expect(req.messages[0].content).not.toContain("UNIQUE-STUDENT-TEXT-123");
    expect(req.messages[1].content).toContain("UNIQUE-STUDENT-TEXT-123");
    expect(req.messages[1].content).toContain("<student_submission>");
  });

  it("honours OPENAI_MODEL", async () => {
    vi.stubEnv("OPENAI_MODEL", "gpt-custom");
    await grade('{"score": 1, "feedback": "x"}');
    expect(openai.requests[0].model).toBe("gpt-custom");
  });

  it("defaults the feedback and survives an empty reply by returning 0", async () => {
    expect((await grade('{"score": 10}')).feedback).toBe("Submission evaluated.");
    expect((await grade("")).score).toBe(0);
  });

  it("propagates API errors so the dispatcher can fall back", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { openaiGrader } = await fresh();
    openai.error = new Error("401 invalid api key");
    await expect(openaiGrader.gradeWithOpenAI("Q", "r", "a", 100, "bad")).rejects.toThrow(/401/);
  });
});

describe("tutor AI assistant", () => {
  it("generateCourseOutlineAI returns the model's outline when it is valid JSON", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key");
    const { assistant } = await fresh();
    const outline = { modules: [{ title: "M1", lessons: [{ title: "L1", content: "c" }] }] };
    gemini.handler = () => "```json\n" + JSON.stringify(outline) + "\n```";
    expect(await assistant.generateCourseOutlineAI("Chemistry")).toEqual(outline);
    expect(gemini.calls[0].prompt).toContain('"Chemistry"');
  });

  it("falls back to a template outline with no API key", async () => {
    const { assistant } = await fresh();
    const outline = await assistant.generateCourseOutlineAI("Biology");
    expect(gemini.calls).toHaveLength(0);
    expect(outline.modules.length).toBeGreaterThanOrEqual(2);
    expect(outline.modules[0].title).toContain("Biology");
    for (const m of outline.modules) {
      expect(m.lessons.length).toBeGreaterThan(0);
      for (const l of m.lessons) expect(l.title && l.content).toBeTruthy();
    }
  });

  it("falls back to the template when the model returns garbage (does not throw)", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { assistant } = await fresh();
    gemini.handler = () => "not json at all";
    const outline = await assistant.generateCourseOutlineAI("Physics");
    expect(outline.modules[0].title).toContain("Physics");
  });

  it("generateAssignmentRubricAI returns the model's text, trimmed", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key");
    const { assistant } = await fresh();
    gemini.handler = () => "  1. Define terms\n2. Give examples  \n";
    expect((await assistant.generateAssignmentRubricAI("Explain osmosis")).referenceAnswer).toBe("1. Define terms\n2. Give examples");
  });

  it("generateAssignmentRubricAI falls back to a generic rubric without a key or on failure", async () => {
    const { assistant } = await fresh();
    expect((await assistant.generateAssignmentRubricAI("x")).referenceAnswer).toMatch(/Key Rubric Points/);

    vi.stubEnv("GEMINI_API_KEY", "key");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const again = await fresh();
    gemini.handler = () => {
      throw new Error("429 quota");
    };
    expect((await again.assistant.generateAssignmentRubricAI("x")).referenceAnswer).toMatch(/Key Rubric Points/);
  });
});
