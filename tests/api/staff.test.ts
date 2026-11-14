import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock, mailMock } from "../helpers/mocks";
import { call, loginAs } from "../helpers/http";

vi.mock("@/lib/ai/assistant", () => ({
  generateCourseOutlineAI: vi.fn(),
  generateAssignmentRubricAI: vi.fn(),
}));

const storage = vi.hoisted(() => ({ createUploadUrl: vi.fn() }));
vi.mock("@/lib/storage", () => ({
  STORAGE_REF_PREFIX: "storage:",
  createUploadUrl: storage.createUploadUrl,
}));

import { generateCourseOutlineAI, generateAssignmentRubricAI } from "@/lib/ai/assistant";
import { GET as announcementsGet, POST as announcementsPost, DELETE as announcementsDelete } from "@/app/api/announcements/route";
import { POST as createCourse, PUT as updateCourse } from "@/app/api/tutor/courses/route";
import { POST as overrideGrade } from "@/app/api/tutor/grade-override/route";
import { POST as assistant } from "@/app/api/tutor/assistant/route";
import { POST as upload } from "@/app/api/tutor/upload/route";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/* ───────────────────────────── announcements ───────────────────────────── */
describe("/api/announcements", () => {
  describe("GET", () => {
    const get = (qs = "?courseId=course_1") => call(announcementsGet, `/api/announcements${qs}`, { method: "GET" });
    beforeEach(() => {
      prismaMock.announcement.findMany.mockResolvedValue([{ id: "a1", title: "Exam date" }]);
    });

    it("requires login and a course id", async () => {
      loginAs(null);
      expect((await get()).status).toBe(401);
      loginAs("STUDENT");
      expect((await get("")).status).toBe(400);
    });

    it("shows announcements to enrolled students only", async () => {
      loginAs("STUDENT");
      prismaMock.enrollment.findUnique.mockResolvedValue({ id: "e" });
      expect((await get()).body.announcements).toHaveLength(1);
      prismaMock.enrollment.findUnique.mockResolvedValue(null);
      expect((await get()).status).toBe(403);
    });

    it("shows announcements to the owning tutor only", async () => {
      const tutor = loginAs("TUTOR")!;
      prismaMock.course.findUnique.mockResolvedValue({ id: "course_1", tutorId: tutor.id });
      expect((await get()).status).toBe(200);
      prismaMock.course.findUnique.mockResolvedValue({ id: "course_1", tutorId: "someone_else" });
      expect((await get()).status).toBe(403);
      prismaMock.course.findUnique.mockResolvedValue(null);
      expect((await get()).status).toBe(403);
    });
  });

  describe("POST", () => {
    const post = (body: unknown) => call(announcementsPost, "/api/announcements", { body });
    const valid = { courseId: "course_1", title: " Exam moved ", content: " See you Monday " };

    beforeEach(() => {
      prismaMock.announcement.create.mockImplementation(async ({ data }: any) => ({ id: "a1", ...data }));
      prismaMock.enrollment.findMany.mockResolvedValue([]);
    });

    it("is for instructors and admins only", async () => {
      loginAs(null);
      expect((await post(valid)).status).toBe(403);
      loginAs("STUDENT");
      expect((await post(valid)).status).toBe(403);
      expect(prismaMock.announcement.create).not.toHaveBeenCalled();
    });

    it("requires course, title and content", async () => {
      loginAs("TUTOR");
      expect((await post({ ...valid, courseId: "" })).status).toBe(400);
      expect((await post({ ...valid, title: "  " })).status).toBe(400);
      expect((await post({ ...valid, content: "" })).status).toBe(400);
    });

    it("404s for an unknown course", async () => {
      loginAs("TUTOR");
      prismaMock.course.findUnique.mockResolvedValue(null);
      expect((await post(valid)).status).toBe(404);
    });

    it("stops a tutor posting to someone else's course, but allows admins", async () => {
      prismaMock.course.findUnique.mockResolvedValue({ id: "course_1", title: "Bio", tutorId: "owner" });
      loginAs("TUTOR");
      expect((await post(valid)).status).toBe(403);
      loginAs("ADMIN");
      expect((await post(valid)).status).toBe(200);
      loginAs("SUPERADMIN");
      expect((await post(valid)).status).toBe(200);
    });

    it("saves trimmed text and emails every ACTIVE student in the course", async () => {
      const tutor = loginAs("TUTOR")!;
      prismaMock.course.findUnique.mockResolvedValue({ id: "course_1", title: "Bio", tutorId: tutor.id });
      prismaMock.enrollment.findMany.mockResolvedValue([
        { student: { email: "a@test.com", name: "A" } },
        { student: { email: "b@test.com", name: "B" } },
        { student: null },
      ]);
      const { status, body } = await post(valid);

      expect(status).toBe(200);
      expect(body.announcement).toMatchObject({ title: "Exam moved", content: "See you Monday" });
      expect(prismaMock.enrollment.findMany.mock.calls[0][0].where).toEqual({ courseId: "course_1", status: "ACTIVE" });
      expect(mailMock.sendAnnouncementEmail).toHaveBeenCalledTimes(2);
      expect(mailMock.sendAnnouncementEmail.mock.calls.map((c) => c[0])).toEqual(["a@test.com", "b@test.com"]);
    });

    it("sets Reply-To to whoever posted, so replies reach a person", async () => {
      const tutor = loginAs("TUTOR")!;
      prismaMock.course.findUnique.mockResolvedValue({ id: "course_1", title: "Bio", tutorId: tutor.id });
      prismaMock.enrollment.findMany.mockResolvedValue([{ student: { email: "a@test.com", name: "A" } }]);
      await post(valid);
      expect(mailMock.sendAnnouncementEmail.mock.calls[0][2]).toEqual({ replyTo: tutor.email });
    });

    it("finishes sending before it answers, so the host cannot cut the emails off", async () => {
      const tutor = loginAs("TUTOR")!;
      prismaMock.course.findUnique.mockResolvedValue({ id: "course_1", title: "Bio", tutorId: tutor.id });
      prismaMock.enrollment.findMany.mockResolvedValue([
        { student: { email: "a@test.com", name: "A" } },
        { student: { email: "b@test.com", name: "B" } },
      ]);
      let delivered = 0;
      mailMock.sendAnnouncementEmail.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 20));
        delivered += 1;
        return true;
      });
      await post(valid);
      expect(delivered).toBe(2);
    });

    it("sends a big class in batches of ten, and one failed address does not stop the rest", async () => {
      const tutor = loginAs("TUTOR")!;
      prismaMock.course.findUnique.mockResolvedValue({ id: "course_1", title: "Bio", tutorId: tutor.id });
      prismaMock.enrollment.findMany.mockResolvedValue(
        Array.from({ length: 25 }, (_, i) => ({ student: { email: `s${i}@test.com`, name: `S${i}` } }))
      );
      let inFlight = 0;
      let peak = 0;
      const sent: string[] = [];
      mailMock.sendAnnouncementEmail.mockImplementation(async (to: string) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight -= 1;
        if (to === "s3@test.com") throw new Error("mailbox full");
        sent.push(to);
        return true;
      });
      expect((await post(valid)).status).toBe(200);
      expect(mailMock.sendAnnouncementEmail).toHaveBeenCalledTimes(25);
      expect(sent).toHaveLength(24);
      expect(peak).toBeLessThanOrEqual(10);
    });

    it("still posts the announcement if email delivery fails", async () => {
      const tutor = loginAs("TUTOR")!;
      prismaMock.course.findUnique.mockResolvedValue({ id: "course_1", title: "Bio", tutorId: tutor.id });
      prismaMock.enrollment.findMany.mockResolvedValue([{ student: { email: "a@test.com", name: "A" } }]);
      mailMock.sendAnnouncementEmail.mockRejectedValue(new Error("smtp"));
      expect((await post(valid)).status).toBe(200);
    });
  });

  describe("DELETE", () => {
    const del = (qs = "?id=a1") => call(announcementsDelete, `/api/announcements${qs}`, { method: "DELETE" });
    const found = (tutorId: string) => prismaMock.announcement.findUnique.mockResolvedValue({ id: "a1", course: { tutorId } });

    it("is for instructors and admins only", async () => {
      loginAs("STUDENT");
      expect((await del()).status).toBe(403);
    });

    it("validates the id and existence", async () => {
      loginAs("TUTOR");
      expect((await del("")).status).toBe(400);
      prismaMock.announcement.findUnique.mockResolvedValue(null);
      expect((await del()).status).toBe(404);
    });

    it("lets the owner delete, and blocks other tutors", async () => {
      const tutor = loginAs("TUTOR")!;
      found(tutor.id);
      expect((await del()).status).toBe(200);
      expect(prismaMock.announcement.delete).toHaveBeenCalledWith({ where: { id: "a1" } });

      prismaMock.announcement.delete.mockClear();
      found("someone_else");
      expect((await del()).status).toBe(403);
      expect(prismaMock.announcement.delete).not.toHaveBeenCalled();
    });

    it("lets admins and super admins delete any announcement", async () => {
      found("someone_else");
      loginAs("ADMIN");
      expect((await del()).status).toBe(200);
      loginAs("SUPERADMIN");
      expect((await del()).status).toBe(200);
    });
  });
});

/* ───────────────────────────── course builder ───────────────────────────── */
describe("/api/tutor/courses", () => {
  const modules = [
    {
      title: "Module 1",
      lessons: [
        { title: "Lesson A", content: "text", videoUrl: "storage:t/v.mp4", assignmentPrompt: "Explain X", assignmentReferenceAnswer: "X is..." },
        { title: "Lesson B" },
      ],
    },
  ];
  const valid = { title: " Biology 101 ", description: " Learn biology ", category: "Science", price: "15000", modules };

  describe("POST (create)", () => {
    const create = (body: unknown) => call(createCourse, "/api/tutor/courses", { body });
    beforeEach(() => {
      prismaMock.course.create.mockImplementation(async ({ data }: any) => ({ id: "course_new", ...data }));
    });

    it("is for tutors and admins only", async () => {
      loginAs(null);
      expect((await create(valid)).status).toBe(403);
      loginAs("STUDENT");
      expect((await create(valid)).status).toBe(403);
      expect(prismaMock.course.create).not.toHaveBeenCalled();
    });

    it("requires title, description and at least one module", async () => {
      loginAs("TUTOR");
      expect((await create({ ...valid, title: " " })).status).toBe(400);
      expect((await create({ ...valid, description: "" })).status).toBe(400);
      expect((await create({ ...valid, modules: [] })).status).toBe(400);
      expect((await create({ ...valid, modules: undefined })).status).toBe(400);
    });

    it("refuses lesson links that could run script in a student's browser, and saves nothing", async () => {
      loginAs("TUTOR");
      for (const bad of ["javascript:alert(1)", "data:text/html,<script>1</script>", "http://example.com/a.pdf"]) {
        const asVideo = [{ title: "M", lessons: [{ title: "A", videoUrl: bad }] }];
        const asFile = [{ title: "M", lessons: [{ title: "A", resourceName: "notes", resourceUrl: bad }] }];
        expect((await create({ ...valid, modules: asVideo })).status).toBe(400);
        expect((await create({ ...valid, modules: asFile })).status).toBe(400);
      }
      expect(prismaMock.course.create).not.toHaveBeenCalled();
    });

    it("creates the course owned by the signed-in tutor, with ordered modules and lessons", async () => {
      const tutor = loginAs("TUTOR")!;
      const { status } = await create(valid);
      expect(status).toBe(200);

      const data = prismaMock.course.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ title: "Biology 101", description: "Learn biology", category: "Science", price: 15000, tutorId: tutor.id, published: true });
      const lessons = data.modules.create[0].lessons.create;
      expect(data.modules.create[0].order).toBe(1);
      expect(lessons.map((l: any) => l.order)).toEqual([1, 2]);
      expect(lessons[0].videoUrl).toBe("storage:t/v.mp4");
    });

    it("attaches a 100-point assignment only to lessons that define one", async () => {
      loginAs("TUTOR");
      await create(valid);
      const [a, b] = prismaMock.course.create.mock.calls[0][0].data.modules.create[0].lessons.create;
      expect(a.assignments.create[0]).toMatchObject({ prompt: "Explain X", referenceAnswer: "X is...", maxScore: 100 });
      expect(b.assignments).toBeUndefined();
    });

    it("applies safe defaults and handles a bad price", async () => {
      loginAs("TUTOR");
      await create({ ...valid, category: undefined, price: "free-ish", level: undefined, modules: [{ title: "M", lessons: [{ title: "L", assignmentPrompt: "Q" }] }] });
      const data = prismaMock.course.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ category: "General", level: "Beginner", price: 0 });
      expect(data.modules.create[0].lessons.create[0].assignments.create[0].referenceAnswer).toBe("Standard reference rubric applies.");
    });
  });

  describe("PUT (edit)", () => {
    const edit = (body: unknown) => call(updateCourse, "/api/tutor/courses", { method: "PUT", body });
    const existing = (tutorId: string, enrollments: unknown[] = []) =>
      prismaMock.course.findUnique.mockResolvedValue({ id: "course_1", tutorId, enrollments });
    const payload = { courseId: "course_1", ...valid };

    beforeEach(() => {
      prismaMock.module.create.mockResolvedValue({ id: "mod_1" });
      prismaMock.lesson.create.mockResolvedValue({ id: "les_1" });
    });

    it("is for tutors and admins, and needs a course id and an existing course", async () => {
      loginAs("STUDENT");
      expect((await edit(payload)).status).toBe(403);
      loginAs("TUTOR");
      expect((await edit({ ...payload, courseId: "" })).status).toBe(400);
      prismaMock.course.findUnique.mockResolvedValue(null);
      expect((await edit(payload)).status).toBe(404);
    });

    it("stops a tutor editing someone else's course, but allows admins", async () => {
      existing("owner");
      loginAs("TUTOR");
      expect((await edit(payload)).status).toBe(403);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      loginAs("ADMIN");
      expect((await edit(payload)).status).toBe(200);
    });

    it("rewrites metadata and the module tree inside one transaction", async () => {
      const tutor = loginAs("TUTOR")!;
      existing(tutor.id);
      expect((await edit(payload)).status).toBe(200);

      expect(prismaMock.$transaction).toHaveBeenCalledOnce();
      expect(prismaMock.course.update.mock.calls[0][0].data).toMatchObject({ title: "Biology 101", price: 15000 });
      expect(prismaMock.module.deleteMany).toHaveBeenCalledWith({ where: { courseId: "course_1" } });
      expect(prismaMock.module.create).toHaveBeenCalledOnce();
      expect(prismaMock.lesson.create).toHaveBeenCalledTimes(2);
      expect(prismaMock.assignment.create).toHaveBeenCalledOnce(); // only the lesson with a prompt
    });

    it("refuses dangerous lesson links when editing too, before anything is rewritten", async () => {
      const tutor = loginAs("TUTOR")!;
      existing(tutor.id);
      const evil = [{ title: "M", lessons: [{ title: "A", videoUrl: "javascript:alert(1)" }] }];
      expect((await edit({ ...payload, modules: evil })).status).toBe(400);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("emails only ACTIVE students about the update", async () => {
      const tutor = loginAs("TUTOR")!;
      existing(tutor.id, [
        { status: "ACTIVE", student: { email: "a@test.com", name: "A" } },
        { status: "COMPLETED", student: { email: "done@test.com", name: "D" } },
      ]);
      await edit(payload);
      expect(mailMock.sendCourseUpdateEmail).toHaveBeenCalledTimes(1);
      expect(mailMock.sendCourseUpdateEmail.mock.calls[0][0]).toBe("a@test.com");
    });

    it("does not wipe the curriculum when no modules are sent", async () => {
      const tutor = loginAs("TUTOR")!;
      existing(tutor.id);
      await edit({ ...payload, modules: [] });
      expect(prismaMock.module.deleteMany).not.toHaveBeenCalled();
    });

    it("answers 400 (not a crash) when required fields are missing", async () => {
      const tutor = loginAs("TUTOR")!;
      existing(tutor.id);
      const { status } = await edit({ courseId: "course_1" });
      expect(status).toBe(400);
    });
  });
});

/* ───────────────────────────── grade override ───────────────────────────── */
describe("POST /api/tutor/grade-override", () => {
  const submission = (tutorId: string, maxScore = 100) => ({
    id: "sub_1",
    student: { email: "stu@test.com", name: "Stu" },
    assignment: { title: "Quiz", maxScore, lesson: { module: { course: { title: "Bio", tutorId } } } },
  });
  const override = (body: unknown) => call(overrideGrade, "/api/tutor/grade-override", { body });

  beforeEach(() => {
    prismaMock.submission.update.mockImplementation(async ({ data }: any) => ({ id: "sub_1", ...data }));
  });

  it("is for instructors and admins only", async () => {
    loginAs("STUDENT");
    expect((await override({ submissionId: "sub_1", newScore: 90 })).status).toBe(403);
    loginAs(null);
    expect((await override({ submissionId: "sub_1", newScore: 90 })).status).toBe(403);
  });

  it("validates the submission id and that the score is a number", async () => {
    loginAs("TUTOR");
    expect((await override({ newScore: 90 })).status).toBe(400);
    for (const bad of [undefined, null, "abc"]) {
      expect((await override({ submissionId: "sub_1", newScore: bad })).status).toBe(400);
    }
  });

  it("404s for an unknown submission", async () => {
    loginAs("TUTOR");
    prismaMock.submission.findUnique.mockResolvedValue(null);
    expect((await override({ submissionId: "x", newScore: 5 })).status).toBe(404);
  });

  it("stops a tutor changing grades in someone else's course", async () => {
    loginAs("TUTOR");
    prismaMock.submission.findUnique.mockResolvedValue(submission("owner"));
    const { status } = await override({ submissionId: "sub_1", newScore: 100 });
    expect(status).toBe(403);
    expect(prismaMock.submission.update).not.toHaveBeenCalled();
  });

  it("enforces 0..maxScore", async () => {
    const tutor = loginAs("TUTOR")!;
    prismaMock.submission.findUnique.mockResolvedValue(submission(tutor.id, 50));
    expect((await override({ submissionId: "sub_1", newScore: 51 })).status).toBe(400);
    expect((await override({ submissionId: "sub_1", newScore: -1 })).status).toBe(400);
    expect((await override({ submissionId: "sub_1", newScore: 50 })).status).toBe(200);
    expect((await override({ submissionId: "sub_1", newScore: 0 })).status).toBe(200);
  });

  it("saves the score and the tutor's feedback, then emails the student", async () => {
    const tutor = loginAs("TUTOR")!;
    prismaMock.submission.findUnique.mockResolvedValue(submission(tutor.id));
    const { status, body } = await override({ submissionId: "sub_1", newScore: "85", tutorFeedback: "  Good reasoning  " });

    expect(status).toBe(200);
    expect(body.submission).toMatchObject({ score: 85, tutorFeedback: "Good reasoning", status: "GRADED" });
    expect(mailMock.sendGradeOverrideEmail).toHaveBeenCalledWith("stu@test.com", {
      studentName: "Stu",
      courseTitle: "Bio",
      assignmentTitle: "Quiz",
      newScore: 85,
      maxScore: 100,
      tutorFeedback: "Good reasoning",
    });
  });

  it("lets admins and super admins override any course's grades", async () => {
    prismaMock.submission.findUnique.mockResolvedValue(submission("owner"));
    loginAs("ADMIN");
    expect((await override({ submissionId: "sub_1", newScore: 70 })).status).toBe(200);
    loginAs("SUPERADMIN");
    expect((await override({ submissionId: "sub_1", newScore: 71 })).status).toBe(200);
  });
});

/* ───────────────────────────── tutor AI assistant ───────────────────────────── */
describe("POST /api/tutor/assistant", () => {
  const ask = (body: unknown) => call(assistant, "/api/tutor/assistant", { body });

  beforeEach(() => {
    vi.mocked(generateCourseOutlineAI).mockResolvedValue({ modules: [{ title: "M", lessons: [] }] });
    vi.mocked(generateAssignmentRubricAI).mockResolvedValue({ referenceAnswer: "rubric" });
  });

  it("is for tutors and admins (students are refused)", async () => {
    loginAs(null);
    expect((await ask({ action: "generate_outline", topic: "x" })).status).toBe(403);
    loginAs("STUDENT");
    expect((await ask({ action: "generate_outline", topic: "x" })).status).toBe(403);
    expect(generateCourseOutlineAI).not.toHaveBeenCalled();
  });

  it("generates an outline for a topic", async () => {
    loginAs("TUTOR");
    const { status, body } = await ask({ action: "generate_outline", topic: "Chemistry" });
    expect(status).toBe(200);
    expect(body.outline.modules).toHaveLength(1);
    expect(generateCourseOutlineAI).toHaveBeenCalledWith("Chemistry");
  });

  it("works for super admins as well as admins", async () => {
    loginAs("SUPERADMIN");
    expect((await ask({ action: "generate_outline", topic: "Chemistry" })).status).toBe(200);
  });

  it("generates a rubric for an assignment prompt", async () => {
    loginAs("ADMIN");
    const { body } = await ask({ action: "generate_rubric", prompt: "Explain osmosis" });
    expect(body.rubric).toEqual({ referenceAnswer: "rubric" });
    expect(generateAssignmentRubricAI).toHaveBeenCalledWith("Explain osmosis");
  });

  it("validates inputs and actions", async () => {
    loginAs("TUTOR");
    expect((await ask({ action: "generate_outline" })).status).toBe(400);
    expect((await ask({ action: "generate_rubric" })).status).toBe(400);
    expect((await ask({ action: "delete_everything" })).status).toBe(400);
  });

  it("limits AI usage per user (15 per 10 minutes)", async () => {
    loginAs("TUTOR");
    const statuses = [];
    for (let i = 0; i < 16; i++) statuses.push((await ask({ action: "nope" })).status);
    expect(statuses[15]).toBe(429);
  });

  it("returns a generic error when the AI layer throws", async () => {
    loginAs("TUTOR");
    vi.mocked(generateCourseOutlineAI).mockRejectedValue(new Error("api key sk-abc invalid"));
    const { status, body } = await ask({ action: "generate_outline", topic: "x" });
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("sk-abc");
  });
});

/* ───────────────────────────── file uploads ───────────────────────────── */
describe("POST /api/tutor/upload (signed upload URLs)", () => {
  const MB = 1024 * 1024;
  const req = (body: unknown) => call(upload, "/api/tutor/upload", { body });
  const ok = { fileName: "Lecture 1.mp4", fileType: "video/mp4", fileSize: 20 * MB };

  beforeEach(() => {
    storage.createUploadUrl.mockReset();
    storage.createUploadUrl.mockImplementation(async (path: string) => `https://acct.r2.cloudflarestorage.com/course-uploads/${path}?X-Amz-Signature=sig`);
  });

  it("is for tutors and admins only", async () => {
    loginAs(null);
    expect((await req(ok)).status).toBe(403);
    loginAs("STUDENT");
    expect((await req(ok)).status).toBe(403);
    expect(storage.createUploadUrl).not.toHaveBeenCalled();
  });

  it("returns a one-time signed upload ticket and a PRIVATE storage reference (never a public URL)", async () => {
    const tutor = loginAs("TUTOR")!;
    const { status, body } = await req(ok);
    expect(status).toBe(200);
    expect(body).toMatchObject({ success: true, contentType: "video/mp4", name: "Lecture 1.mp4" });
    expect(body.uploadUrl).toContain("r2.cloudflarestorage.com");
    expect(body.url).toBe(`storage:${body.path}`);
    expect(body.url).not.toMatch(/^https?:/);
    expect(body.path.startsWith(`${tutor.id}/`)).toBe(true);
    expect(storage.createUploadUrl).toHaveBeenCalledWith(body.path, "video/mp4", 20 * MB);
  });

  it("rejects files over 100 MB and non-numeric sizes", async () => {
    loginAs("TUTOR");
    expect((await req({ ...ok, fileSize: 100 * MB + 1 })).status).toBe(413);
    expect((await req({ ...ok, fileSize: "20" })).status).toBe(413);
    expect((await req({ ...ok, fileSize: 100 * MB })).status).toBe(200);
  });

  it.each([
    "application/x-msdownload",
    "application/x-sh",
    "text/html",
    "image/svg+xml",
    "application/javascript",
    "",
  ])("rejects dangerous or unknown file type %j", async (fileType) => {
    loginAs("TUTOR");
    expect((await req({ ...ok, fileType })).status).toBe(415);
    expect(storage.createUploadUrl).not.toHaveBeenCalled();
  });

  it("accepts the type Windows browsers report for .zip files and stores it as application/zip", async () => {
    loginAs("TUTOR");
    const { status, body } = await req({ fileName: "notes.zip", fileType: "application/x-zip-compressed", fileSize: 5 * MB });
    expect(status).toBe(200);
    expect(body.contentType).toBe("application/zip");
    expect(body.path.endsWith(".zip")).toBe(true);
  });

  it.each([
    ["application/pdf", ".pdf"],
    ["video/mp4", ".mp4"],
    ["video/webm", ".webm"],
    ["video/ogg", ".ogv"],
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
    ["application/zip", ".zip"],
    ["application/msword", ".doc"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
    ["application/vnd.ms-powerpoint", ".ppt"],
    ["application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx"],
    ["text/plain", ".txt"],
  ])("accepts %s and forces the %s extension", async (fileType, ext) => {
    loginAs("TUTOR");
    const { status, body } = await req({ fileName: "notes.bin", fileType, fileSize: 1000 });
    expect(status).toBe(200);
    expect(body.path.endsWith(ext)).toBe(true);
  });

  it("derives the extension from the verified MIME type, not the claimed file name", async () => {
    loginAs("TUTOR");
    const { body } = await req({ fileName: "totally-safe.exe", fileType: "application/pdf", fileSize: 10 });
    expect(body.path.endsWith(".pdf")).toBe(true);
    expect(body.path).not.toContain(".exe");
  });

  it("neutralises path traversal and odd characters in file names", async () => {
    const tutor = loginAs("TUTOR")!;
    for (const fileName of ["../../etc/passwd.pdf", "..\\..\\windows\\system32.pdf", "a/b/c.pdf", "na me;rm -rf /.pdf", "<script>.pdf"]) {
      const { body } = await req({ fileName, fileType: "application/pdf", fileSize: 10 });
      const name = body.path.slice(tutor.id.length + 1);
      expect(body.path.startsWith(`${tutor.id}/`)).toBe(true);
      expect(name).not.toMatch(/[\\/]/);
      expect(name).not.toContain("..");
      expect(name).toMatch(/^[A-Za-z0-9_.-]+$/);
    }
  });

  it("truncates very long names and never produces the same path twice", async () => {
    loginAs("TUTOR");
    const a = (await req({ fileName: "x".repeat(300) + ".pdf", fileType: "application/pdf", fileSize: 10 })).body.path;
    const b = (await req({ fileName: "x".repeat(300) + ".pdf", fileType: "application/pdf", fileSize: 10 })).body.path;
    expect(a.length).toBeLessThan(120);
    expect(a).not.toBe(b);
  });

  it("requires a file name", async () => {
    loginAs("TUTOR");
    expect((await req({ fileType: "application/pdf", fileSize: 1 })).status).toBe(400);
  });

  it("returns a generic error when storage fails", async () => {
    loginAs("TUTOR");
    storage.createUploadUrl.mockRejectedValue(new Error("bucket course-uploads missing at r2.cloudflarestorage.com"));
    const { status, body } = await req(ok);
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("cloudflare");
  });

  it("limits ticket requests per user (30 per 10 minutes)", async () => {
    loginAs("TUTOR");
    const statuses = [];
    for (let i = 0; i < 31; i++) statuses.push((await req({})).status);
    expect(statuses[30]).toBe(429);
  });
});
