import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { prismaMock, mailMock, cookieJar } from "../helpers/mocks";
import { call, loginAs, makeUser } from "../helpers/http";

/* Real heuristic grader by default; individual tests override the AI result. */
vi.mock("@/lib/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai")>();
  return { ...actual, evaluateSubmissionAI: vi.fn(actual.evaluateSubmissionAI) };
});

import { evaluateSubmissionAI } from "@/lib/ai";
import { POST as grade } from "@/app/api/grade/route";
import { POST as progress } from "@/app/api/student/progress/route";
import { POST as drop } from "@/app/api/student/courses/drop/route";
import { POST as completeCourse } from "@/app/api/courses/complete/route";
import { POST as updateProfile } from "@/app/api/student/profile/route";
import { POST as discussion } from "@/app/api/student/discussion/route";
import { verifySessionToken } from "@/lib/auth";
import { ACADEMIC_STRUCTURE } from "@/lib/academicStructure";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/* ───────────────────────────── AI grading endpoint ───────────────────────────── */
describe("POST /api/grade", () => {
  const REFERENCE = "Photosynthesis converts sunlight into chemical energy stored in glucose molecules using chlorophyll.";
  const assignment = {
    id: "asg_1",
    title: "Photosynthesis quiz",
    prompt: "Explain photosynthesis.",
    referenceAnswer: REFERENCE,
    maxScore: 100,
    lesson: { module: { course: { id: "course_1", title: "Biology 101" } } },
  };

  let student: ReturnType<typeof makeUser>;

  beforeEach(() => {
    student = loginAs("STUDENT") as any;
    prismaMock.assignment.findUnique.mockResolvedValue(assignment);
    prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr_1" });
    prismaMock.submission.findFirst.mockResolvedValue(null);
    prismaMock.submission.create.mockImplementation(async ({ data }: any) => ({ id: "sub_1", ...data }));
    prismaMock.submission.update.mockImplementation(async ({ data }: any) => ({ id: "sub_1", ...data }));
    vi.mocked(evaluateSubmissionAI).mockClear();
  });

  it("requires a signed-in user", async () => {
    loginAs(null);
    expect((await call(grade, "/api/grade", { body: { assignmentId: "asg_1", content: "x" } })).status).toBe(401);
    expect(evaluateSubmissionAI).not.toHaveBeenCalled();
  });

  it.each([
    ["no content", { assignmentId: "asg_1" }],
    ["whitespace-only content", { assignmentId: "asg_1", content: "   \n " }],
    ["no assignment id", { content: "my answer" }],
  ])("rejects a submission with %s without spending an AI call", async (_l, body) => {
    expect((await call(grade, "/api/grade", { body })).status).toBe(400);
    expect(evaluateSubmissionAI).not.toHaveBeenCalled();
  });

  it("404s for an unknown assignment", async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(null);
    expect((await call(grade, "/api/grade", { body: { assignmentId: "nope", content: "x" } })).status).toBe(404);
  });

  it("refuses students who are not enrolled in the course (no free grading, no peeking)", async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    const { status } = await call(grade, "/api/grade", { body: { assignmentId: "asg_1", content: "x" } });
    expect(status).toBe(403);
    expect(evaluateSubmissionAI).not.toHaveBeenCalled();
    expect(prismaMock.submission.create).not.toHaveBeenCalled();
    expect(prismaMock.enrollment.findUnique.mock.calls[0][0].where.studentId_courseId).toEqual({ studentId: student.id, courseId: "course_1" });
  });

  it("grades with the AI using the tutor's question, reference answer and max score", async () => {
    vi.mocked(evaluateSubmissionAI).mockResolvedValueOnce({ score: 82, feedback: "Solid answer." });
    const { status, body } = await call(grade, "/api/grade", { body: { assignmentId: "asg_1", content: "Plants make glucose from light." } });

    expect(status).toBe(200);
    expect(evaluateSubmissionAI).toHaveBeenCalledWith("Explain photosynthesis.", REFERENCE, "Plants make glucose from light.", 100);
    expect(body.evaluation).toEqual({ score: 82, feedback: "Solid answer." });
    expect(prismaMock.submission.create.mock.calls[0][0].data).toMatchObject({
      assignmentId: "asg_1",
      studentId: student.id,
      content: "Plants make glucose from light.",
      score: 82,
      aiFeedback: "Solid answer.",
      status: "GRADED",
    });
  });

  it("emails the student their grade", async () => {
    vi.mocked(evaluateSubmissionAI).mockResolvedValueOnce({ score: 90, feedback: "Great" });
    await call(grade, "/api/grade", { body: { assignmentId: "asg_1", content: "answer" } });
    expect(mailMock.sendGradeEmail).toHaveBeenCalledWith(student.email, {
      studentName: student.name,
      courseTitle: "Biology 101",
      assignmentTitle: "Photosynthesis quiz",
      score: 90,
      maxScore: 100,
      feedback: "Great",
    });
  });

  it("works end to end with the built-in grader when no AI key is configured", async () => {
    const { body } = await call(grade, "/api/grade", {
      body: { assignmentId: "asg_1", content: "Photosynthesis converts sunlight into chemical energy stored in glucose molecules using chlorophyll." },
    });
    expect(body.evaluation.score).toBe(100);
    const wrong = await call(grade, "/api/grade", { body: { assignmentId: "asg_1", content: "Football is a popular sport played worldwide by millions." } });
    expect(wrong.body.evaluation.score).toBeLessThan(50);
  });

  it("lets a student resubmit: the previous submission is replaced, not duplicated", async () => {
    prismaMock.submission.findFirst.mockResolvedValue({ id: "sub_old" });
    vi.mocked(evaluateSubmissionAI).mockResolvedValueOnce({ score: 95, feedback: "Better" });
    const { status } = await call(grade, "/api/grade", { body: { assignmentId: "asg_1", content: "improved answer" } });

    expect(status).toBe(200);
    expect(prismaMock.submission.create).not.toHaveBeenCalled();
    const update = prismaMock.submission.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: "sub_old" });
    expect(update.data).toMatchObject({ content: "improved answer", score: 95, status: "GRADED" });
    expect(update.data.submittedAt).toBeInstanceOf(Date);
  });

  it("looks for the previous submission only among THIS student's work", async () => {
    await call(grade, "/api/grade", { body: { assignmentId: "asg_1", content: "x" } });
    expect(prismaMock.submission.findFirst).toHaveBeenCalledWith({ where: { assignmentId: "asg_1", studentId: student.id } });
  });

  it("stores whatever score the grader returns, which the graders themselves keep within 0..max", async () => {
    vi.mocked(evaluateSubmissionAI).mockResolvedValueOnce({ score: 100, feedback: "f" });
    const { body } = await call(grade, "/api/grade", { body: { assignmentId: "asg_1", content: "x" } });
    expect(body.submission.score).toBeLessThanOrEqual(assignment.maxScore);
  });

  it("returns a generic error (no internals) when grading blows up", async () => {
    vi.mocked(evaluateSubmissionAI).mockRejectedValueOnce(new Error("boom: secret internal detail"));
    const { status, body } = await call(grade, "/api/grade", { body: { assignmentId: "asg_1", content: "x" } });
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("secret internal detail");
  });

  it("limits each student to 10 submissions per 10 minutes (protects the AI budget)", async () => {
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await call(grade, "/api/grade", { body: { content: "" } })).status);
    expect(statuses.slice(0, 10).every((s) => s === 400)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("rate limits are per student, not global", async () => {
    for (let i = 0; i < 11; i++) await call(grade, "/api/grade", { body: { content: "" } });
    loginAs("STUDENT");
    expect((await call(grade, "/api/grade", { body: { content: "" } })).status).toBe(400);
  });
});

/* ───────────────────────────── lesson progress ───────────────────────────── */
describe("POST /api/student/progress", () => {
  beforeEach(() => {
    loginAs("STUDENT", { id: "stu_p" });
    prismaMock.lesson.findUnique.mockResolvedValue({ id: "les_1", module: { course: { id: "course_1" } } });
    prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr_1" });
    prismaMock.lessonProgress.upsert.mockImplementation(async ({ create }: any) => ({ id: "p1", ...create }));
  });

  it("requires login and a lesson id", async () => {
    loginAs(null);
    expect((await call(progress, "/api/student/progress", { body: { lessonId: "les_1" } })).status).toBe(401);
    loginAs("STUDENT");
    expect((await call(progress, "/api/student/progress", { body: {} })).status).toBe(400);
  });

  it("404s for an unknown lesson", async () => {
    prismaMock.lesson.findUnique.mockResolvedValue(null);
    expect((await call(progress, "/api/student/progress", { body: { lessonId: "x" } })).status).toBe(404);
  });

  it("blocks progress updates for courses the student has not joined", async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    expect((await call(progress, "/api/student/progress", { body: { lessonId: "les_1", completed: true } })).status).toBe(403);
    expect(prismaMock.lessonProgress.upsert).not.toHaveBeenCalled();
  });

  it("marks a lesson complete with a timestamp", async () => {
    const { status, body } = await call(progress, "/api/student/progress", { body: { lessonId: "les_1", completed: true } });
    expect(status).toBe(200);
    expect(body.progress).toMatchObject({ studentId: "stu_p", lessonId: "les_1", completed: true });
    expect(prismaMock.lessonProgress.upsert.mock.calls[0][0].update.completedAt).toBeInstanceOf(Date);
  });

  it("can mark a lesson incomplete again (clears the timestamp)", async () => {
    await call(progress, "/api/student/progress", { body: { lessonId: "les_1", completed: false } });
    expect(prismaMock.lessonProgress.upsert.mock.calls[0][0].update).toEqual({ completed: false, completedAt: null });
  });
});

/* ───────────────────────────── dropping a course ───────────────────────────── */
describe("POST /api/student/courses/drop", () => {
  const enrollment = (status = "ACTIVE") => ({
    id: "enr_1",
    status,
    course: { title: "Biology 101", modules: [{ lessons: [{ id: "l1" }, { id: "l2" }] }, { lessons: [{ id: "l3" }] }] },
  });

  beforeEach(() => {
    loginAs("STUDENT", { id: "stu_d" });
    prismaMock.enrollment.findUnique.mockResolvedValue(enrollment());
  });

  it("requires a signed-in student and a course id", async () => {
    loginAs(null);
    expect((await call(drop, "/api/student/courses/drop", { body: { courseId: "c" } })).status).toBe(401);
    loginAs("TUTOR");
    expect((await call(drop, "/api/student/courses/drop", { body: { courseId: "c" } })).status).toBe(403);
    loginAs("STUDENT");
    expect((await call(drop, "/api/student/courses/drop", { body: {} })).status).toBe(400);
  });

  it("404s when the student is not enrolled", async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    expect((await call(drop, "/api/student/courses/drop", { body: { courseId: "c" } })).status).toBe(404);
  });

  it("will not drop a completed course (the certificate stays)", async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue(enrollment("COMPLETED"));
    const { status, body } = await call(drop, "/api/student/courses/drop", { body: { courseId: "c" } });
    expect(status).toBe(400);
    expect(body.error).toMatch(/cannot be dropped/);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("removes the enrollment and this student's lesson progress together, releasing the lock", async () => {
    const { status, body } = await call(drop, "/api/student/courses/drop", { body: { courseId: "c" } });
    expect(status).toBe(200);
    expect(body.message).toMatch(/Biology 101/);
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(prismaMock.lessonProgress.deleteMany).toHaveBeenCalledWith({ where: { studentId: "stu_d", lessonId: { in: ["l1", "l2", "l3"] } } });
    expect(prismaMock.enrollment.delete).toHaveBeenCalledWith({ where: { id: "enr_1" } });
  });
});

/* ───────────────────────────── completing a course / certificate ───────────────────────────── */
describe("POST /api/courses/complete", () => {
  const sub = (score: number | null) => [{ score }];
  const enrollmentWith = (assignments: Array<{ maxScore: number; submissions: Array<{ score: number | null }> }>) => ({
    id: "enrollment-abcdef123456",
    course: { title: "Biology 101", modules: [{ lessons: [{ assignments }] }] },
  });

  let student: ReturnType<typeof makeUser>;
  beforeEach(() => {
    student = loginAs("STUDENT") as any;
    prismaMock.enrollment.update.mockImplementation(async ({ data }: any) => ({ id: "enr", ...data }));
  });

  const complete = () => call(completeCourse, "/api/courses/complete", { body: { courseId: "course_1" } });

  it("requires login, a course id and an enrollment", async () => {
    loginAs(null);
    expect((await complete()).status).toBe(401);
    loginAs("STUDENT");
    expect((await call(completeCourse, "/api/courses/complete", { body: {} })).status).toBe(400);
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    expect((await complete()).status).toBe(404);
  });

  it("blocks completion until every assignment has a graded submission", async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue(
      enrollmentWith([{ maxScore: 100, submissions: sub(90) }, { maxScore: 100, submissions: [] }])
    );
    const { status, body } = await complete();
    expect(status).toBe(400);
    expect(body.error).toMatch(/submit all assignments/);
    expect(prismaMock.enrollment.update).not.toHaveBeenCalled();
  });

  it("treats an ungraded (null score) submission as missing", async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue(enrollmentWith([{ maxScore: 100, submissions: sub(null) }]));
    expect((await complete()).status).toBe(400);
  });

  it("enforces the 70% pass mark: 69% is refused", async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue(enrollmentWith([{ maxScore: 100, submissions: sub(69) }]));
    const { status, body } = await complete();
    expect(status).toBe(400);
    expect(body.error).toMatch(/69%/);
    expect(prismaMock.enrollment.update).not.toHaveBeenCalled();
  });

  it("exactly 70% passes", async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue(enrollmentWith([{ maxScore: 100, submissions: sub(70) }]));
    const { status } = await complete();
    expect(status).toBe(200);
    expect(prismaMock.enrollment.update.mock.calls[0][0].data).toMatchObject({ status: "COMPLETED" });
    expect(prismaMock.enrollment.update.mock.calls[0][0].data.completedAt).toBeInstanceOf(Date);
  });

  it("averages by total points, not by assignment count", async () => {
    // 10/10 on a small quiz and 60/100 on the big one = 70/110 = 63.6%: must fail
    prismaMock.enrollment.findUnique.mockResolvedValue(
      enrollmentWith([{ maxScore: 10, submissions: sub(10) }, { maxScore: 100, submissions: sub(60) }])
    );
    expect((await complete()).status).toBe(400);
    // 100/100 plus 5/10 = 105/110 = 95%: passes
    prismaMock.enrollment.findUnique.mockResolvedValue(
      enrollmentWith([{ maxScore: 100, submissions: sub(100) }, { maxScore: 10, submissions: sub(5) }])
    );
    expect((await complete()).status).toBe(200);
  });

  it("a course with no assignments can be completed", async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue(enrollmentWith([]));
    expect((await complete()).status).toBe(200);
  });

  it("emails a completion certificate with an ID derived from the enrollment", async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue(enrollmentWith([{ maxScore: 100, submissions: sub(88) }]));
    await complete();
    expect(mailMock.sendCompletionEmail).toHaveBeenCalledWith(student.email, {
      studentName: student.name,
      courseTitle: "Biology 101",
      certificateId: "CERT-EF123456", // last 8 characters of "enrollment-abcdef123456", upper-cased
    });
  });

  it("only looks at the signed-in student's submissions", async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue(enrollmentWith([]));
    await complete();
    const query = JSON.stringify(prismaMock.enrollment.findUnique.mock.calls[0][0]);
    expect(query).toContain(student.id);
  });
});

/* ───────────────────────────── profile & password ───────────────────────────── */
describe("POST /api/student/profile", () => {
  let user: ReturnType<typeof makeUser>;
  let hash: string;

  beforeEach(async () => {
    hash ??= await bcrypt.hash("old-password", 4);
    user = loginAs("STUDENT") as any;
    prismaMock.user.findUnique.mockResolvedValue({ id: user.id, password: hash });
    prismaMock.user.update.mockImplementation(async ({ data, where }: any) => ({ id: where.id, role: "STUDENT", password: "HASH", ...data }));
  });

  it("requires login and a name", async () => {
    loginAs(null);
    expect((await call(updateProfile, "/api/student/profile", { body: { name: "A" } })).status).toBe(401);
    loginAs("STUDENT");
    expect((await call(updateProfile, "/api/student/profile", { body: { name: "  " } })).status).toBe(400);
  });

  it("updates name, faculty, department and phone, and never returns the password hash", async () => {
    const { status, body } = await call(updateProfile, "/api/student/profile", {
      body: { name: "  New Name ", faculty: ` ${ACADEMIC_STRUCTURE[1].name} `, department: ` ${ACADEMIC_STRUCTURE[1].departments[0]} `, phone: "0803 111 2222" },
    });
    expect(status).toBe(200);
    expect(body.user).not.toHaveProperty("password");
    expect(prismaMock.user.update.mock.calls[0][0].data).toMatchObject({
      name: "New Name",
      faculty: ACADEMIC_STRUCTURE[1].name,
      department: ACADEMIC_STRUCTURE[1].departments[0],
      phone: "08031112222",
    });
  });

  describe("faculty and department", () => {
    const [first, second] = ACADEMIC_STRUCTURE;
    const save = (body: Record<string, unknown>) => call(updateProfile, "/api/student/profile", { body: { name: "Ada", ...body } });

    it("accepts a real faculty with one of its own departments", async () => {
      const { status } = await save({ faculty: first.name, department: first.departments[2] });
      expect(status).toBe(200);
      expect(prismaMock.user.update.mock.calls[0][0].data).toMatchObject({ faculty: first.name, department: first.departments[2] });
    });

    it("rejects a faculty that does not exist", async () => {
      const { status, body } = await save({ faculty: "School of Wizardry", department: first.departments[0] });
      expect(status).toBe(400);
      expect(body.error).toMatch(/faculty/i);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("rejects a department that belongs to a DIFFERENT faculty", async () => {
      const { status, body } = await save({ faculty: first.name, department: second.departments[0] });
      expect(status).toBe(400);
      expect(body.error).toMatch(/department/i);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("rejects an invented department", async () => {
      expect((await save({ faculty: first.name, department: "Department of Made-Up Studies" })).status).toBe(400);
    });

    it("checks a department-only change against the faculty the student already has", async () => {
      // the logged-in student's faculty is ACADEMIC_STRUCTURE[0] (see the test helper)
      expect((await save({ department: first.departments[1] })).status).toBe(200);
      expect((await save({ department: second.departments[0] })).status).toBe(400);
    });

    it("lets a name-only or phone-only update through without touching faculty rules", async () => {
      expect((await save({})).status).toBe(200);
      expect((await save({ phone: "08031112222" })).status).toBe(200);
      expect(prismaMock.user.update.mock.calls[0][0].data).not.toHaveProperty("faculty");
    });

    it("lets a blank faculty and department clear them", async () => {
      expect((await save({ faculty: "", department: "" })).status).toBe(200);
      expect(prismaMock.user.update.mock.calls[0][0].data).toMatchObject({ faculty: null, department: null });
    });
  });

  it("rejects an invalid phone number and can clear it", async () => {
    expect((await call(updateProfile, "/api/student/profile", { body: { name: "A", phone: "abc" } })).status).toBe(400);
    await call(updateProfile, "/api/student/profile", { body: { name: "A", phone: "" } });
    expect(prismaMock.user.update.mock.calls[0][0].data.phone).toBeNull();
  });

  it("does not touch the password when none is supplied", async () => {
    await call(updateProfile, "/api/student/profile", { body: { name: "Same Name" } });
    const data = prismaMock.user.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("password");
    expect(data).not.toHaveProperty("sessionsValidAfter");
  });

  describe("changing the password", () => {
    it("requires the current password", async () => {
      const { status, body } = await call(updateProfile, "/api/student/profile", { body: { name: "A", password: "brand-new-1" } });
      expect(status).toBe(403);
      expect(body.error).toMatch(/current password/i);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("rejects a wrong current password", async () => {
      const { status } = await call(updateProfile, "/api/student/profile", { body: { name: "A", password: "brand-new-1", currentPassword: "guess" } });
      expect(status).toBe(403);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("rejects a new password under 6 characters", async () => {
      const { status } = await call(updateProfile, "/api/student/profile", { body: { name: "A", password: "12345", currentPassword: "old-password" } });
      expect(status).toBe(400);
    });

    it("saves a hash, revokes other sessions and re-issues THIS session so the user stays signed in", async () => {
      const { status } = await call(updateProfile, "/api/student/profile", { body: { name: "A", password: "brand-new-1", currentPassword: "old-password" } });
      expect(status).toBe(200);

      const data = prismaMock.user.update.mock.calls[0][0].data;
      expect(await bcrypt.compare("brand-new-1", data.password)).toBe(true);
      expect(data.sessionsValidAfter).toBeInstanceOf(Date);
      expect(verifySessionToken(cookieJar.get("lms_user_id")!.value)?.userId).toBe(user.id);
      expect(cookieJar.options("lms_user_id")).toMatchObject({ httpOnly: true });
    });

    it("is rate limited (10 changes per 15 minutes)", async () => {
      const statuses = [];
      for (let i = 0; i < 11; i++) statuses.push((await call(updateProfile, "/api/student/profile", { body: { name: "" } })).status);
      expect(statuses[10]).toBe(429);
    });
  });
});

/* ───────────────────────────── discussion ───────────────────────────── */
describe("POST /api/student/discussion", () => {
  const lessonFor = (tutorId = "tutor_x") => ({ id: "les_1", module: { course: { id: "course_1", tutorId } } });
  const postFor = (over: Record<string, unknown> = {}) => ({
    id: "post_1",
    userId: "someone_else",
    lesson: { module: { course: { id: "course_1", tutorId: "tutor_x" } } },
    ...over,
  });
  const send = (body: unknown) => call(discussion, "/api/student/discussion", { body });

  beforeEach(() => {
    prismaMock.discussionPost.create.mockImplementation(async ({ data }: any) => ({ id: "post_new", ...data }));
    prismaMock.discussionReply.create.mockImplementation(async ({ data }: any) => ({ id: "reply_new", ...data }));
  });

  it("requires login and non-empty content", async () => {
    loginAs(null);
    expect((await send({ action: "create_post", lessonId: "l", content: "hi" })).status).toBe(401);
    loginAs("STUDENT");
    expect((await send({ action: "create_post", lessonId: "l", content: "   " })).status).toBe(400);
  });

  it("rejects unknown actions", async () => {
    loginAs("STUDENT");
    expect((await send({ action: "hack", content: "x" })).status).toBe(400);
  });

  describe("create_post", () => {
    it("lets an enrolled student post", async () => {
      const student = loginAs("STUDENT")!;
      prismaMock.lesson.findUnique.mockResolvedValue(lessonFor());
      prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr" });
      const { status, body } = await send({ action: "create_post", lessonId: "les_1", content: "Question?" });
      expect(status).toBe(200);
      expect(body.post).toMatchObject({ lessonId: "les_1", userId: student.id, content: "Question?" });
    });

    it("blocks students who are not enrolled", async () => {
      loginAs("STUDENT");
      prismaMock.lesson.findUnique.mockResolvedValue(lessonFor());
      prismaMock.enrollment.findUnique.mockResolvedValue(null);
      expect((await send({ action: "create_post", lessonId: "les_1", content: "x" })).status).toBe(403);
      expect(prismaMock.discussionPost.create).not.toHaveBeenCalled();
    });

    it("lets the course's own tutor and any admin post without enrolling", async () => {
      const tutor = loginAs("TUTOR")!;
      prismaMock.lesson.findUnique.mockResolvedValue(lessonFor(tutor.id));
      expect((await send({ action: "create_post", lessonId: "les_1", content: "Welcome!" })).status).toBe(200);
      loginAs("ADMIN");
      expect((await send({ action: "create_post", lessonId: "les_1", content: "Hello" })).status).toBe(200);
      expect(prismaMock.enrollment.findUnique).not.toHaveBeenCalled();
    });

    it("blocks a tutor who does not own the course", async () => {
      loginAs("TUTOR");
      prismaMock.lesson.findUnique.mockResolvedValue(lessonFor("another_tutor"));
      prismaMock.enrollment.findUnique.mockResolvedValue(null);
      expect((await send({ action: "create_post", lessonId: "les_1", content: "x" })).status).toBe(403);
    });

    it("needs a lesson id and an existing lesson", async () => {
      loginAs("STUDENT");
      expect((await send({ action: "create_post", content: "x" })).status).toBe(400);
      prismaMock.lesson.findUnique.mockResolvedValue(null);
      expect((await send({ action: "create_post", lessonId: "zzz", content: "x" })).status).toBe(404);
    });
  });

  describe("create_reply", () => {
    it("lets an enrolled student reply", async () => {
      loginAs("STUDENT");
      prismaMock.discussionPost.findUnique.mockResolvedValue(postFor());
      prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr" });
      const { status, body } = await send({ action: "create_reply", postId: "post_1", content: "Answer" });
      expect(status).toBe(200);
      expect(body.reply).toMatchObject({ postId: "post_1", content: "Answer" });
    });

    it("blocks outsiders, missing posts and missing ids", async () => {
      loginAs("STUDENT");
      prismaMock.discussionPost.findUnique.mockResolvedValue(postFor());
      prismaMock.enrollment.findUnique.mockResolvedValue(null);
      expect((await send({ action: "create_reply", postId: "post_1", content: "x" })).status).toBe(403);
      prismaMock.discussionPost.findUnique.mockResolvedValue(null);
      expect((await send({ action: "create_reply", postId: "gone", content: "x" })).status).toBe(404);
      expect((await send({ action: "create_reply", content: "x" })).status).toBe(400);
    });
  });

  describe("delete_post", () => {
    it("lets the author delete their own post", async () => {
      const student = loginAs("STUDENT")!;
      prismaMock.discussionPost.findUnique.mockResolvedValue(postFor({ userId: student.id }));
      const { status, body } = await send({ action: "delete_post", postId: "post_1", content: "x" });
      expect(status).toBe(200);
      expect(body.deletedPostId).toBe("post_1");
      expect(prismaMock.discussionPost.delete).toHaveBeenCalledWith({ where: { id: "post_1" } });
    });

    it("lets the course tutor and admins moderate", async () => {
      loginAs("TUTOR", { id: "tutor_x" });
      prismaMock.discussionPost.findUnique.mockResolvedValue(postFor());
      expect((await send({ action: "delete_post", postId: "post_1", content: "x" })).status).toBe(200);
      loginAs("ADMIN");
      expect((await send({ action: "delete_post", postId: "post_1", content: "x" })).status).toBe(200);
      loginAs("SUPERADMIN");
      expect((await send({ action: "delete_post", postId: "post_1", content: "x" })).status).toBe(200);
    });

    it("forbids other students and other tutors", async () => {
      loginAs("STUDENT");
      prismaMock.discussionPost.findUnique.mockResolvedValue(postFor());
      expect((await send({ action: "delete_post", postId: "post_1", content: "x" })).status).toBe(403);
      loginAs("TUTOR", { id: "not_the_owner" });
      expect((await send({ action: "delete_post", postId: "post_1", content: "x" })).status).toBe(403);
      expect(prismaMock.discussionPost.delete).not.toHaveBeenCalled();
    });
  });

  it("rate limits chatty users (20 posts per 5 minutes)", async () => {
    loginAs("STUDENT");
    const statuses = [];
    for (let i = 0; i < 21; i++) statuses.push((await send({ action: "create_post", content: "" })).status);
    expect(statuses[20]).toBe(429);
  });
});
