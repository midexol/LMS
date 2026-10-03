import { GoogleGenerativeAI } from "@google/generative-ai";

export async function gradeWithGemini(
  assignmentPrompt: string,
  referenceAnswer: string,
  studentAnswer: string,
  maxScore: number,
  apiKey: string
): Promise<{ score: number; feedback: string }> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const promptText = `
You are an expert academic evaluator. Compare the student's submission against the tutor's reference answer and rubric.

ASSIGNMENT QUESTION:
${assignmentPrompt}

TUTOR REFERENCE ANSWER AND GRADING RUBRIC:
${referenceAnswer}

STUDENT SUBMISSION:
${studentAnswer}

MAXIMUM SCORE POSSIBLE: ${maxScore}

Evaluate the student's answer based on relevance, accuracy, and key points matched.
Return ONLY a valid JSON object strictly matching this format (no markdown formatting, no code block backticks):
{
  "score": <number between 0 and ${maxScore}>,
  "feedback": "<detailed constructive feedback explaining points awarded, missing concepts, and strengths>"
}
`;

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
