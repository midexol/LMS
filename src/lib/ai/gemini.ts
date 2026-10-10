import { buildGradingSystemPrompt, buildGradingUserPrompt } from "./gradingPrompt";
import { generateWithGemini } from "./geminiModels";

export async function gradeWithGemini(
  assignmentPrompt: string,
  referenceAnswer: string,
  studentAnswer: string,
  maxScore: number,
  apiKey: string
): Promise<{ score: number; feedback: string }> {
  try {
    const promptText = buildGradingUserPrompt(assignmentPrompt, referenceAnswer, studentAnswer, maxScore);

    const responseText = await generateWithGemini(apiKey, promptText, buildGradingSystemPrompt(maxScore));
    const cleanText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    return {
      score: Math.min(maxScore, Math.max(0, Math.round(Number(parsed.score) || 0))),
      feedback: String(parsed.feedback || "Submission evaluated."),
    };
  } catch (error) {
    console.error("[AI GRADINGS ERROR - GEMINI]", error);
    throw error;
  }
}
