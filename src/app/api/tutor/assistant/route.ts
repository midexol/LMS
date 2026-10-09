import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateCourseOutlineAI, generateAssignmentRubricAI } from "@/lib/ai/assistant";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "TUTOR" && currentUser.role !== "ADMIN")) {
      return NextResponse.json({ error: "Only instructors can access the AI assistant." }, { status: 403 });
    }

    const { action, topic, prompt } = await req.json();

    if (action === "generate_outline") {
      if (!topic) {
        return NextResponse.json({ error: "Topic is required for syllabus generation." }, { status: 400 });
      }
      const outline = await generateCourseOutlineAI(topic);
      return NextResponse.json({ success: true, outline });
    }

    if (action === "generate_rubric") {
      if (!prompt) {
        return NextResponse.json({ error: "Assignment prompt is required for rubric generation." }, { status: 400 });
      }
      const rubric = await generateAssignmentRubricAI(prompt);
      return NextResponse.json({ success: true, rubric });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("[TUTOR ASSISTANT API ERROR]", error);
    return NextResponse.json({ error: "AI Assistant process failed." }, { status: 500 });
  }
}
