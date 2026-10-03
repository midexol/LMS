import { gradeWithGemini } from "./gemini";
import { gradeWithOpenAI } from "./openai";

export interface EvaluationResult {
  score: number;
  feedback: string;
}

export async function evaluateSubmissionAI(
  assignmentPrompt: string,
  referenceAnswer: string,
  studentAnswer: string,
  maxScore: number
): Promise<EvaluationResult> {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  if (provider === "gemini" && geminiKey) {
    try {
      return await gradeWithGemini(assignmentPrompt, referenceAnswer, studentAnswer, maxScore, geminiKey);
    } catch (err) {
      console.warn("[AI GRADINGS] Gemini failed, falling back to heuristic grader.", err);
    }
  }

  if (provider === "openai" && openAIKey) {
    try {
      return await gradeWithOpenAI(assignmentPrompt, referenceAnswer, studentAnswer, maxScore, openAIKey);
    } catch (err) {
      console.warn("[AI GRADINGS] OpenAI failed, falling back to heuristic grader.", err);
    }
  }

  // Smart heuristic & keyword semantic matcher fallback (runs out of the box without API keys)
  return fallbackHeuristicGrader(assignmentPrompt, referenceAnswer, studentAnswer, maxScore);
}

function fallbackHeuristicGrader(
  prompt: string,
  reference: string,
  submission: string,
  maxScore: number
): EvaluationResult {
  const normRef = reference.toLowerCase();
  const normSub = submission.toLowerCase();

  // Extract meaningful words (length > 3)
  const refWords = Array.from(new Set(normRef.match(/\b[a-z]{4,}\b/g) || []));
  const subWords = new Set(normSub.match(/\b[a-z]{4,}\b/g) || []);

  if (refWords.length === 0) {
    return {
      score: maxScore,
      feedback: "Submission recorded successfully. Full points awarded based on completed answer criteria.",
    };
  }

  let matched = 0;
  const missingWords: string[] = [];

  for (const word of refWords) {
    if (subWords.has(word)) {
      matched++;
    } else {
      missingWords.push(word);
    }
  }

  const ratio = matched / refWords.length;
  const minRatio = normSub.length > 50 ? 0.4 : 0.2;
  const finalRatio = Math.min(1, Math.max(minRatio, ratio + (normSub.length > 100 ? 0.35 : 0.15)));
  
  const score = Math.round(maxScore * finalRatio);
  
  let feedback = `Automated Evaluation Summary:\n`;
  feedback += `Score: ${score}/${maxScore} (${Math.round(finalRatio * 100)}% match accuracy).\n\n`;
  
  if (finalRatio >= 0.8) {
    feedback += `Excellent response. Your submission effectively addresses the core requirements and key concepts outlined in the tutor reference model answer.`;
  } else if (finalRatio >= 0.5) {
    feedback += `Good effort. Your response covers basic concepts but could be improved by providing deeper details on: ${missingWords.slice(0, 3).join(", ")}.`;
  } else {
    feedback += `Needs improvement. Your submission is missing several key points mentioned in the rubric criteria. Consider expanding on: ${missingWords.slice(0, 4).join(", ")}.`;
  }

  return { score, feedback };
}
