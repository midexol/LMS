import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildGradingSystemPrompt, buildGradingUserPrompt, GEMINI_MODEL } from "./gradingPrompt";

export async function gradeWithGemini(
  assignmentPrompt: string,
  referenceAnswer: string,
  studentAnswer: string,
  maxScore: number,
  apiKey: string
): Promise<{ score: number; feedback: string }> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: buildGradingSystemPrompt(maxScore),
    });

    const promptText = buildGradingUserPrompt(assignmentPrompt, referenceAnswer, studentAnswer, maxScore);

    const result = await model.generateContent(promptText);
    const responseText = result.response.text();
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
