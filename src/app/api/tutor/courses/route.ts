import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendCourseUpdateEmail } from "@/lib/mail";
import { lessonLinksAreSafe, LESSON_LINK_ERROR } from "@/lib/safeUrl";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "TUTOR" && currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Only tutors can create courses." }, { status: 403 });
    }

    const { title, category, faculty, department, level, price, description, coverImage, modules } = await req.json();

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
    }

    if (!modules || !Array.isArray(modules) || modules.length === 0) {
      return NextResponse.json({ error: "At least one module is required." }, { status: 400 });
    }

    if (!lessonLinksAreSafe(modules)) {
      return NextResponse.json({ error: LESSON_LINK_ERROR }, { status: 400 });
    }

    const newCourse = await prisma.course.create({
      data: {
        title: title.trim(),
        category: category || "General",
        faculty: faculty?.trim() || null,
        department: department?.trim() || null,
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
      { error: "Failed to create course." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "TUTOR" && currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const { courseId, title, category, faculty, department, level, price, description, coverImage, modules } = await req.json();

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required." }, { status: 400 });
    }

    if (typeof title !== "string" || !title.trim() || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
    }

    if (!lessonLinksAreSafe(modules)) {
      return NextResponse.json({ error: LESSON_LINK_ERROR }, { status: 400 });
    }

    const existingCourse = await prisma.course.findUnique({
      where: { id: courseId },
      include: { enrollments: { include: { student: true } } },
    });

    if (!existingCourse) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (existingCourse.tutorId !== currentUser.id && currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "You can only edit your own courses." }, { status: 403 });
    }

    // Update course metadata and replace modules/lessons
    await prisma.$transaction(async (tx) => {
      await tx.course.update({
        where: { id: courseId },
        data: {
          title: title.trim(),
          category: category || "General",
          faculty: faculty?.trim() || null,
          department: department?.trim() || null,
          level: level || "Beginner",
          price: parseFloat(price) || 0,
          description: description.trim(),
          coverImage: coverImage?.trim() || null,
        },
      });

      if (modules && Array.isArray(modules) && modules.length > 0) {
        await tx.module.deleteMany({ where: { courseId } });

        for (let mIdx = 0; mIdx < modules.length; mIdx++) {
          const m = modules[mIdx];
          const newModule = await tx.module.create({
            data: {
              title: m.title,
              order: mIdx + 1,
              courseId,
            },
          });

          if (m.lessons && Array.isArray(m.lessons)) {
            for (let lIdx = 0; lIdx < m.lessons.length; lIdx++) {
              const l = m.lessons[lIdx];
              const newLesson = await tx.lesson.create({
                data: {
                  title: l.title,
                  content: l.content || "",
                  videoUrl: l.videoUrl || "",
                  resourceName: l.resourceName || "",
                  resourceUrl: l.resourceUrl || "",
                  order: lIdx + 1,
                  moduleId: newModule.id,
                },
              });

              if (l.assignmentPrompt?.trim()) {
                await tx.assignment.create({
                  data: {
                    title: `Assignment: ${l.title}`,
                    prompt: l.assignmentPrompt.trim(),
                    referenceAnswer: l.assignmentReferenceAnswer?.trim() || "Standard reference rubric applies.",
                    maxScore: 100,
                    lessonId: newLesson.id,
                  },
                });
              }
            }
          }
        }
      }
    });

    // Notify all active students of the curriculum updates
    try {
      const activeEnrollments = existingCourse.enrollments.filter((e) => e.status === "ACTIVE");
      for (const e of activeEnrollments) {
        if (e.student?.email) {
          sendCourseUpdateEmail(e.student.email, {
            studentName: e.student.name,
            courseTitle: title.trim(),
            updateSummary: `Instructor ${currentUser.name} has updated the curriculum and learning materials for this course.`,
          }).catch((err) => console.error("[COURSE UPDATE EMAIL ERROR]", err));
        }
      }
    } catch (err) {
      console.error("[STUDENT NOTIFICATION FAILED]", err);
    }

    return NextResponse.json({ success: true, message: "Course updated successfully." });
  } catch (error: any) {
    console.error("[TUTOR COURSE UPDATE API ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update course." },
      { status: 500 }
    );
  }
}

