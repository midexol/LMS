import { generateWithGemini } from "./geminiModels";

export async function generateCourseOutlineAI(topic: string): Promise<{
  modules: Array<{ title: string; lessons: Array<{ title: string; content: string }> }>;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const prompt = `
Generate a structured course syllabus for the topic: "${topic}".
Include 3 modules, with 2 lessons in each module.
Return ONLY valid JSON in this exact structure without markdown or backticks:
{
  "modules": [
    {
      "title": "Module title",
      "lessons": [
        { "title": "Lesson title", "content": "Detailed lesson overview and key points." }
      ]
    }
  ]
}
`;
      const text = (await generateWithGemini(apiKey, prompt)).replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(text);
    } catch (e) {
      console.log("[AI ASSISTANT FALLBACK] Could not fetch from API, using smart template.", e);
    }
  }

  // Fallback outline generator
  return {
    modules: [
      {
        title: `Module 1: Fundamentals of ${topic}`,
        lessons: [
          {
            title: `Introduction & Core Principles of ${topic}`,
            content: `Overview of ${topic}, foundational concepts, background context, and practical applications.`,
          },
          {
            title: `Key Components & Architecture`,
            content: `Detailed breakdown of key concepts, methodologies, and standard practices in ${topic}.`,
          },
        ],
      },
      {
        title: `Module 2: Practical Implementation`,
        lessons: [
          {
            title: `Hands-on Exercises & Workflows`,
            content: `Step by step walkthrough, exercises, real world scenario analysis, and common patterns.`,
          },
          {
            title: `Best Practices & Problem Solving`,
            content: `Avoiding pitfalls, optimization techniques, and troubleshooting guidelines.`,
          },
        ],
      },
    ],
  };
}

export async function generateAssignmentRubricAI(prompt: string): Promise<{
  referenceAnswer: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const query = `
Given this assignment prompt: "${prompt}"
Generate a comprehensive model answer and key grading rubric criteria that students should include in their response.
Return plain text without emdashes or emojis.
`;
      return { referenceAnswer: (await generateWithGemini(apiKey, query)).trim() };
    } catch (e) {
      console.log("[AI ASSISTANT FALLBACK] Rubric fallback used.", e);
    }
  }

  return {
    referenceAnswer: `Key Rubric Points Required for Full Credit:\n1. Clear explanation addressing all aspects of the question.\n2. Accurate terminology and correct conceptual reasoning.\n3. Concrete examples or step by step demonstration.\n4. Logical structure and clear concluding insights.`,
  };
}
