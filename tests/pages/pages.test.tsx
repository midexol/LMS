import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { prismaMock } from "../helpers/mocks";
import { loginAs } from "../helpers/http";

/* redirect() and notFound() throw in Next.js; model that so tests can see where a visitor ends up. */
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/storage", () => ({
  resolveStorageUrl: vi.fn(async (v: string | null | undefined) => (v?.startsWith("storage:") ? `https://signed.test/${v.slice(8)}?t=1` : v ?? "")),
  getStorageAdmin: vi.fn(),
  STORAGE_BUCKET: "course-uploads",
  STORAGE_REF_PREFIX: "storage:",
}));

import DashboardPage from "@/app/dashboard/page";
import HomePage from "@/app/page";
import MyCoursesPage from "@/app/my-courses/page";
import InstructorPage from "@/app/instructor/page";
import AdminPage from "@/app/admin/page";
import AdminUserDetailPage from "@/app/admin/users/[id]/page";
import CoursePlayerPage from "@/app/student/courses/[courseId]/page";
import CoursePreviewPage from "@/app/courses/[courseId]/page";
import CoursesCatalogPage from "@/app/courses/page";
import OnboardingPage from "@/app/onboarding/page";
import { OnboardingClient } from "@/app/onboarding/OnboardingClient";
import { LandingPage } from "@/app/LandingPage";

async function destination(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return "RENDERED";
  } catch (e: any) {
    return e.message.replace(/^REDIRECT:/, "→ ");
  }
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("/dashboard (role router)", () => {
  it.each([
    [null, "→ /login"],
    ["STUDENT", "→ /my-courses"],
    ["TUTOR", "→ /instructor"],
    ["ADMIN", "→ /admin"],
    ["SUPERADMIN", "→ /admin"],
  ] as const)("%s goes %s", async (role, expected) => {
    loginAs(role);
    expect(await destination(() => DashboardPage())).toBe(expected);
  });
});

describe("/ (landing page)", () => {
  it.each([
    ["STUDENT", "→ /my-courses"],
    ["TUTOR", "→ /instructor"],
    ["ADMIN", "→ /admin"],
    ["SUPERADMIN", "→ /admin"],
  ] as const)("signed-in %s skips the landing page: %s", async (role, expected) => {
    loginAs(role);
    expect(await destination(() => HomePage({}))).toBe(expected);
  });

  it("shows visitors only REAL data: published courses and live category counts", async () => {
    loginAs(null);
    prismaMock.course.findMany.mockResolvedValue([{ id: "c1", title: "Bio" }]);
    prismaMock.course.groupBy.mockResolvedValue([
      { category: "Science", _count: { _all: 2 } },
      { category: "Business", _count: { _all: 7 } },
    ]);

    const element: any = await HomePage({});

    expect(element.type).toBe(LandingPage);
    expect(Object.keys(element.props).sort()).toEqual(["categoryCounts", "currentUser", "featuredCourses"]); // no invented stats
    expect(element.props.categoryCounts).toEqual([
      { category: "Business", count: 7 },
      { category: "Science", count: 2 },
    ]);
    expect(prismaMock.course.findMany.mock.calls[0][0].where).toEqual({ published: true });
    expect(prismaMock.course.groupBy.mock.calls[0][0].where).toEqual({ published: true });
  });

  it("passes empty lists (not fake numbers) when there are no courses", async () => {
    loginAs(null);
    prismaMock.course.findMany.mockResolvedValue([]);
    prismaMock.course.groupBy.mockResolvedValue([]);
    const element: any = await HomePage({});
    expect(element.props.featuredCourses).toEqual([]);
    expect(element.props.categoryCounts).toEqual([]);
  });

  it("?view=catalog lists published courses only", async () => {
    loginAs(null);
    prismaMock.course.findMany.mockResolvedValue([]);
    await HomePage({ searchParams: { view: "catalog" } });
    expect(prismaMock.course.findMany.mock.calls[0][0].where).toEqual({ published: true });
  });
});

describe("/my-courses (student dashboard)", () => {
  const enrollment = (status: string, completedLessons: number, over: Record<string, unknown> = {}) => ({
    id: `enr_${status}`,
    courseId: "course_1",
    status,
    enrolledAt: new Date("2026-04-01"),
    completedAt: status === "COMPLETED" ? new Date("2026-05-01") : null,
    course: {
      id: "course_1",
      title: status === "COMPLETED" ? "Finished Course" : "Intro to Biology",
      category: "Science",
      tutor: { name: "Dr Tutor" },
      modules: [
        {
          lessons: [
            { id: "l1", lessonProgress: completedLessons >= 1 ? [{ completed: true }] : [] },
            { id: "l2", lessonProgress: completedLessons >= 2 ? [{ completed: true }] : [] },
            { id: "l3", lessonProgress: [] },
            { id: "l4", lessonProgress: [] },
          ],
        },
      ],
    },
    ...over,
  });
  const html = async () => renderToStaticMarkup((await MyCoursesPage()) as any);

  it("shows progress for the active course and a way to continue", async () => {
    loginAs("STUDENT");
    prismaMock.enrollment.findMany.mockResolvedValue([enrollment("ACTIVE", 2)]);
    const out = await html();
    expect(out).toContain("Intro to Biology");
    expect(out).toContain("50% (2/4 lessons)");
    expect(out).toContain('href="/student/courses/course_1"');
    expect(out).toContain("Continue Learning");
  });

  it("invites a new student to browse the catalog", async () => {
    loginAs("STUDENT");
    prismaMock.enrollment.findMany.mockResolvedValue([]);
    const out = await html();
    expect(out).toContain("No Active Course Enrollment");
    expect(out).toContain('href="/courses"');
  });

  it("lists completed courses separately from the active one", async () => {
    loginAs("STUDENT");
    prismaMock.enrollment.findMany.mockResolvedValue([enrollment("ACTIVE", 1), enrollment("COMPLETED", 4)]);
    const out = await html();
    expect(out).toContain("Intro to Biology");
    expect(out).toContain("Finished Course");
  });

  it("only loads this student's own enrollments and progress", async () => {
    const student = loginAs("STUDENT")!;
    prismaMock.enrollment.findMany.mockResolvedValue([]);
    await html();
    const query = prismaMock.enrollment.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ studentId: student.id });
    expect(JSON.stringify(query.include)).toContain(student.id);
  });
});

describe("/instructor dashboard figures", () => {
  const course = (submissions: Array<{ score: number | null; maxScore: number }>) => ({
    id: "c1",
    title: "Biology 101",
    published: true,
    modules: [
      {
        lessons: [
          {
            assignments: [
              {
                submissions: submissions.map((s, i) => ({ id: `s${i}`, score: s.score, assignment: { maxScore: s.maxScore } })),
              },
            ],
          },
        ],
      },
    ],
    enrollments: [],
    announcements: [],
  });
  const metricsFor = async (subs: Array<{ score: number | null; maxScore: number }>) => {
    loginAs("TUTOR");
    prismaMock.course.findMany.mockResolvedValue([course(subs)]);
    return ((await InstructorPage({})) as any).props.metrics;
  };

  it("with no graded work every figure is null: nothing is invented", async () => {
    const m = await metricsFor([]);
    expect(m.avgScore).toBeNull();
    expect(m.avgGradeLetter).toBeNull();
    expect(m.passRate).toBeNull();
    expect(m.gradeDistribution).toBeNull();
    expect(m).not.toHaveProperty("performanceBars");
  });

  it("ungraded submissions do not count as grades", async () => {
    const m = await metricsFor([{ score: null, maxScore: 100 }]);
    expect(m.avgScore).toBeNull();
    expect(m.totalSubmissions).toBe(1);
  });

  it("computes the real average, letter and pass rate", async () => {
    const m = await metricsFor([{ score: 90, maxScore: 100 }, { score: 70, maxScore: 100 }, { score: 50, maxScore: 100 }]);
    expect(m.avgScore).toBe(70);
    expect(m.avgGradeLetter).toBe("C");
    expect(m.passRate).toBe(67);
  });

  it("scores each assignment against its own maximum", async () => {
    const m = await metricsFor([{ score: 9, maxScore: 10 }, { score: 45, maxScore: 50 }]); // both 90%
    expect(m.avgScore).toBe(90);
  });

  it("only loads this instructor's own courses", async () => {
    const tutor = loginAs("TUTOR")!;
    prismaMock.course.findMany.mockResolvedValue([]);
    await InstructorPage({});
    expect(prismaMock.course.findMany.mock.calls[0][0].where).toEqual({ tutorId: tutor.id });
  });
});

describe("/onboarding (choose faculty and department)", () => {
  it("sends visitors to login", async () => {
    loginAs(null);
    expect(await destination(() => OnboardingPage())).toBe("→ /login");
  });

  it.each([
    ["TUTOR", "→ /instructor"],
    ["ADMIN", "→ /admin"],
    ["SUPERADMIN", "→ /admin"],
  ] as const)("is not for a %s: they are sent to %s", async (role, expected) => {
    loginAs(role);
    expect(await destination(() => OnboardingPage())).toBe(expected);
  });

  it("skips students who already chose (nothing to ask twice)", async () => {
    loginAs("STUDENT"); // the helper gives students a faculty and department
    expect(await destination(() => OnboardingPage())).toBe("→ /my-courses");
  });

  it.each([
    ["no faculty", { faculty: null }],
    ["no department", { department: null }],
    ["neither", { faculty: null, department: null }],
  ])("asks a student with %s", async (_label, missing) => {
    loginAs("STUDENT", { name: "Ada Obi", email: "ada@gmail.com", ...missing });
    const element: any = await OnboardingPage();
    expect(element.type).toBe(OnboardingClient);
    expect(element.props).toEqual({ name: "Ada Obi", email: "ada@gmail.com" });
  });
});

describe("/my-courses requires a faculty and department", () => {
  it("sends a student without them to onboarding BEFORE loading anything", async () => {
    loginAs("STUDENT", { faculty: null, department: null });
    expect(await destination(() => MyCoursesPage())).toBe("→ /onboarding");
    expect(prismaMock.enrollment.findMany).not.toHaveBeenCalled();
  });

  it("lets a student who has them in", async () => {
    loginAs("STUDENT");
    prismaMock.enrollment.findMany.mockResolvedValue([]);
    expect(await destination(() => MyCoursesPage())).toBe("RENDERED");
  });
});

describe("/my-courses and /instructor", () => {
  it("my-courses sends visitors to login and non-students to the instructor area", async () => {
    loginAs(null);
    expect(await destination(() => MyCoursesPage())).toBe("→ /login");
    loginAs("TUTOR");
    expect(await destination(() => MyCoursesPage())).toBe("→ /instructor");
  });

  it("instructor area sends visitors to login and students to their courses", async () => {
    loginAs(null);
    expect(await destination(() => InstructorPage({}))).toBe("→ /login");
    loginAs("STUDENT");
    expect(await destination(() => InstructorPage({}))).toBe("→ /my-courses");
  });
});

describe("/admin", () => {
  it.each([
    [null, "→ /admin/login"],
    ["STUDENT", "→ /my-courses"],
    ["TUTOR", "→ /my-courses"],
  ] as const)("%s is turned away: %s", async (role, expected) => {
    loginAs(role);
    expect(await destination(() => AdminPage({}))).toBe(expected);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled(); // no data is even loaded
  });

  it("loads the platform for an admin, including the inbox, and honours ?tab=", async () => {
    loginAs("ADMIN");
    prismaMock.user.findMany.mockResolvedValue([{ id: "u1", role: "STUDENT" }, { id: "u2", role: "TUTOR" }]);
    prismaMock.course.findMany.mockResolvedValue([{ published: true }, { published: false }]);
    prismaMock.enrollment.findMany.mockResolvedValue([{ status: "ACTIVE", course: { price: 5000 } }]);
    prismaMock.submission.findMany.mockResolvedValue([]);
    prismaMock.contactMessage.findMany.mockResolvedValue([{ id: "m1", status: "NEW" }]);

    const element: any = await AdminPage({ searchParams: { tab: "messages" } });
    expect(element.props.initialTab).toBe("messages");
    expect(element.props.initialMessages).toHaveLength(1);
    expect(element.props.metrics).toMatchObject({ totalUsers: 2, totalStudents: 1, totalTutors: 1, totalCourses: 2, publishedCourses: 1, totalRevenue: 5000 });

    const userSelect = prismaMock.user.findMany.mock.calls[0][0].select;
    expect(userSelect).not.toHaveProperty("password");
    expect(userSelect).toMatchObject({ phone: true, lastLoginAt: true, emailVerified: true });
  });

  it("falls back to the overview for an unknown tab", async () => {
    loginAs("SUPERADMIN");
    for (const m of [prismaMock.user, prismaMock.course, prismaMock.enrollment, prismaMock.submission, prismaMock.contactMessage]) m.findMany.mockResolvedValue([]);
    expect(((await AdminPage({ searchParams: { tab: "../../etc" } })) as any).props.initialTab).toBe("overview");
  });
});

describe("/admin/users/[id]", () => {
  const user = {
    id: "u1",
    name: "Ada Obi",
    email: "ada@test.com",
    role: "STUDENT",
    phone: "08031234567",
    faculty: "Science",
    department: "Chemistry",
    emailVerified: true,
    lastLoginAt: new Date("2026-05-02T10:00:00"),
    createdAt: new Date("2026-04-01T10:00:00"),
    enrollments: [{ id: "e1", status: "ACTIVE", enrolledAt: new Date("2026-04-02"), completedAt: null, course: { id: "c1", title: "Biology 101" } }],
    payments: [
      { id: "p1", reference: "REF-OK", amount: 15000, status: "SUCCESS", paidAt: new Date("2026-04-02"), createdAt: new Date("2026-04-02"), course: { title: "Biology 101" } },
      { id: "p2", reference: "REF-FAILED", amount: 9000, status: "FAILED", paidAt: null, createdAt: new Date("2026-04-03"), course: { title: "Chem" } },
    ],
    submissions: [
      { id: "s1", score: 80, status: "GRADED", submittedAt: new Date("2026-04-05"), assignment: { title: "Quiz 1", maxScore: 100, lesson: { module: { course: { title: "Biology 101" } } } } },
      { id: "s2", score: 60, status: "GRADED", submittedAt: new Date("2026-04-06"), assignment: { title: "Quiz 2", maxScore: 100, lesson: { module: { course: { title: "Biology 101" } } } } },
    ],
    _count: { lessonProgress: 4, discussionPosts: 1 },
  };

  it("is for admins only", async () => {
    loginAs(null);
    expect(await destination(() => AdminUserDetailPage({ params: { id: "u1" } }))).toBe("→ /admin/login");
    for (const role of ["STUDENT", "TUTOR"] as const) {
      loginAs(role);
      expect(await destination(() => AdminUserDetailPage({ params: { id: "u1" } }))).toBe("→ /my-courses");
    }
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("404s for an unknown user", async () => {
    loginAs("ADMIN");
    prismaMock.user.findUnique.mockResolvedValue(null);
    expect(await destination(() => AdminUserDetailPage({ params: { id: "nope" } }))).toBe("NOT_FOUND");
  });

  it("never selects the password hash", async () => {
    loginAs("ADMIN");
    prismaMock.user.findUnique.mockResolvedValue(user);
    await AdminUserDetailPage({ params: { id: "u1" } });
    expect(prismaMock.user.findUnique.mock.calls[0][0].select).not.toHaveProperty("password");
  });

  it("shows the profile, only SUCCESSFUL payments in the total paid, and the average score", async () => {
    loginAs("SUPERADMIN");
    prismaMock.user.findUnique.mockResolvedValue(user);
    const html = renderToStaticMarkup((await AdminUserDetailPage({ params: { id: "u1" } })) as any);

    expect(html).toContain("Ada Obi");
    expect(html).toContain("ada@test.com");
    expect(html).toContain("08031234567");
    expect(html).toContain("verified");
    expect(html).toContain("REF-OK");
    expect(html).toContain("REF-FAILED");
    expect(html).toMatch(/Total paid[\s\S]*15,000/); // the failed 9,000 is not counted
    expect(html).not.toMatch(/Total paid[\s\S]{0,80}24,000/);
    expect(html).toMatch(/Average score[\s\S]*70%/); // (80 + 60) / 2
    expect(html).toContain("Quiz 1");
  });

  it("shows sensible empty states and 'Never' for last login", async () => {
    loginAs("ADMIN");
    prismaMock.user.findUnique.mockResolvedValue({ ...user, enrollments: [], payments: [], submissions: [], lastLoginAt: null, phone: null, emailVerified: false });
    const html = renderToStaticMarkup((await AdminUserDetailPage({ params: { id: "u1" } })) as any);
    expect(html).toContain("Not enrolled in any course");
    expect(html).toContain("No payments yet");
    expect(html).toContain("No submissions yet");
    expect(html).toContain("Never");
    expect(html).toContain("No phone number");
    expect(html).toContain("not verified");
  });
});

describe("/student/courses/[courseId] (the paid course player)", () => {
  const course = {
    id: "course_1",
    title: "Biology 101",
    category: "Science",
    modules: [
      {
        id: "m1",
        lessons: [
          { id: "l1", videoUrl: "storage:tutor_1/lecture.mp4", resourceUrl: "storage:tutor_1/notes.pdf", resourceName: "Notes" },
          { id: "l2", videoUrl: "https://www.youtube.com/embed/abc", resourceUrl: "", resourceName: "" },
        ],
      },
    ],
  };
  const open = (id = "course_1") => CoursePlayerPage({ params: { courseId: id } });

  it("sends visitors to login and staff to their own areas (the player is students-only)", async () => {
    loginAs(null);
    expect(await destination(open)).toBe("→ /login");
    loginAs("TUTOR");
    expect(await destination(open)).toBe("→ /instructor");
    loginAs("ADMIN");
    expect(await destination(open)).toBe("→ /admin");
    loginAs("SUPERADMIN");
    expect(await destination(open)).toBe("→ /admin");
  });

  it("404s for an unknown course", async () => {
    loginAs("STUDENT");
    prismaMock.course.findUnique.mockResolvedValue(null);
    expect(await destination(open)).toBe("NOT_FOUND");
  });

  it("turns away students who have not enrolled, WITHOUT creating any signed links", async () => {
    loginAs("STUDENT");
    prismaMock.course.findUnique.mockResolvedValue(course);
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    expect(await destination(open)).toBe("→ /");
    const { resolveStorageUrl } = await import("@/lib/storage");
    expect(resolveStorageUrl).not.toHaveBeenCalled();
  });

  it("for an enrolled student, swaps private storage references for short-lived signed links", async () => {
    const student = loginAs("STUDENT")!;
    prismaMock.course.findUnique.mockResolvedValue(course);
    prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr_1", studentId: student.id });

    const page: any = await open();
    const player = page.props.children[1];
    const lessons = player.props.course.modules[0].lessons;

    expect(lessons[0].videoUrl).toBe("https://signed.test/tutor_1/lecture.mp4?t=1");
    expect(lessons[0].resourceUrl).toBe("https://signed.test/tutor_1/notes.pdf?t=1");
    expect(lessons[1].videoUrl).toBe("https://www.youtube.com/embed/abc"); // normal links untouched
    expect(JSON.stringify(player.props.course)).not.toContain("storage:");
    expect(player.props.student.id).toBe(student.id);
  });

  it("only loads this student's own submissions and progress", async () => {
    const student = loginAs("STUDENT")!;
    prismaMock.course.findUnique.mockResolvedValue({ ...course, modules: [] });
    prismaMock.enrollment.findUnique.mockResolvedValue({ id: "e" });
    await open();
    const query = JSON.stringify(prismaMock.course.findUnique.mock.calls[0][0]);
    expect(query.match(new RegExp(student.id, "g"))!.length).toBeGreaterThanOrEqual(2);
  });
});

describe("public course preview /courses/[courseId]", () => {
  it("404s for unpublished or missing courses", async () => {
    loginAs(null);
    prismaMock.course.findUnique.mockResolvedValue(null);
    expect(await destination(() => CoursePreviewPage({ params: { courseId: "x" } }))).toBe("NOT_FOUND");
    expect(prismaMock.course.findUnique.mock.calls[0][0].where).toEqual({ id: "x", published: true });
  });

  it("never loads lesson content, videos or files for non-enrolled visitors", async () => {
    loginAs(null);
    prismaMock.course.findUnique.mockResolvedValue({
      id: "c",
      title: "T",
      description: "A course description",
      category: "Science",
      level: "Beginner",
      price: 1000,
      faculty: null,
      department: null,
      coverImage: null,
      tutor: { name: "Tutor", email: "t@test.com" },
      modules: [],
    });
    await CoursePreviewPage({ params: { courseId: "c" } });
    const lessonSelect = prismaMock.course.findUnique.mock.calls[0][0].include.modules.include.lessons.select;
    expect(lessonSelect).toEqual({ id: true, title: true, assignments: { select: { id: true } } });
    expect(lessonSelect).not.toHaveProperty("videoUrl");
    expect(lessonSelect).not.toHaveProperty("content");
    expect(lessonSelect).not.toHaveProperty("resourceUrl");
  });
});

describe("/courses catalog", () => {
  beforeEach(() => {
    prismaMock.course.findMany.mockResolvedValue([]);
    prismaMock.enrollment.findFirst.mockResolvedValue(null);
  });

  it("shows only published courses, and narrows students to their department", async () => {
    loginAs("STUDENT", { department: "Chemistry" });
    await CoursesCatalogPage({ searchParams: {} });
    expect(prismaMock.course.findMany.mock.calls[0][0].where).toEqual({ published: true, department: "Chemistry" });
  });

  it("shows everything published to visitors and to students with no department", async () => {
    loginAs(null);
    await CoursesCatalogPage({ searchParams: {} });
    expect(prismaMock.course.findMany.mock.calls[0][0].where).toEqual({ published: true });
    loginAs("STUDENT", { department: null });
    await CoursesCatalogPage({ searchParams: {} });
    expect(prismaMock.course.findMany.mock.calls[1][0].where).toEqual({ published: true });
  });

  it("passes the homepage search (?q=) through to the catalogue, trimmed to a sane length", async () => {
    loginAs(null);
    const result: any = await CoursesCatalogPage({ searchParams: { q: "marketing" } });
    expect(result.props.initialSearch).toBe("marketing");
    const long: any = await CoursesCatalogPage({ searchParams: { q: "x".repeat(500) } });
    expect(long.props.initialSearch.length).toBe(100);
    const none: any = await CoursesCatalogPage({ searchParams: {} });
    expect(none.props.initialSearch).toBe("");
  });

  it("looks up the signed-in student's active enrollment for the lock banner", async () => {
    const student = loginAs("STUDENT")!;
    await CoursesCatalogPage({ searchParams: {} });
    expect(prismaMock.enrollment.findFirst.mock.calls[0][0].where).toEqual({ studentId: student.id, status: "ACTIVE" });
  });
});
