import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "TUTOR" && currentUser.role !== "ADMIN")) {
      return NextResponse.json({ error: "Only tutors can create courses." }, { status: 403 });
    }

    const { title, category, level, price, description, coverImage, modules } = await req.json();

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
    }

    if (!modules || !Array.isArray(modules) || modules.length === 0) {
      return NextResponse.json({ error: "At least one module is required." }, { status: 400 });
    }

    const newCourse = await prisma.course.create({
      data: {
        title: title.trim(),
        category: category || "General",
        level: level || "Beginner",
        price: parseFloat(price) || 0,
        description: description.trim(),
        coverImage: coverImage?.trim() || null,
        published: true,
        tutorId: currentUser.id,
        modules: {
          create: modules.map((m: any, mIdx: number) => ({
            title: m.title,
            order: mIdx + 1,
            lessons: {
              create: m.lessons.map((l: any, lIdx: number) => ({
                title: l.title,
                content: l.content || "",
                videoUrl: l.videoUrl || "",
                resourceName: l.resourceName || "",
                resourceUrl: l.resourceUrl || "",
                order: lIdx + 1,
                assignments: l.assignmentPrompt
                  ? {
                      create: [
                        {
                          title: `Assignment: ${l.title}`,
                          prompt: l.assignmentPrompt,
                          referenceAnswer:
                            l.assignmentReferenceAnswer || "Standard reference rubric applies.",
                          maxScore: 100,
                        },
                      ],
                    }
                  : undefined,
              })),
            },
          })),
        },
      },
    });

    return NextResponse.json({ success: true, course: newCourse });
  } catch (error: any) {
    console.error("[TUTOR COURSE CREATE API ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create course." },
      { status: 500 }
    );
  }
}
