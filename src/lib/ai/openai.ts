import OpenAI from "openai";
import { buildGradingSystemPrompt, buildGradingUserPrompt, OPENAI_MODEL } from "./gradingPrompt";

export async function gradeWithOpenAI(
  assignmentPrompt: string,
  referenceAnswer: string,
  studentAnswer: string,
  maxScore: number,
  apiKey: string
): Promise<{ score: number; feedback: string }> {
  try {
    const openai = new OpenAI({ apiKey });
    const promptText = buildGradingUserPrompt(assignmentPrompt, referenceAnswer, studentAnswer, maxScore);

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: buildGradingSystemPrompt(maxScore) },
        { role: "user", content: promptText },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content);

    return {
      score: Math.min(maxScore, Math.max(0, Math.round(Number(parsed.score) || 0))),
      feedback: String(parsed.feedback || "Submission evaluated."),
    };
  } catch (error) {
    console.error("[AI GRADINGS ERROR - OPENAI]", error);
    throw error;
  }
}
