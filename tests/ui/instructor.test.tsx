// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within, act } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/instructor",
}));

import { TutorSubmissionsReviewer } from "@/components/tutor/TutorSubmissionsReviewer";
import { AnnouncementManager } from "@/components/tutor/AnnouncementManager";
import { InstructorClient } from "@/app/instructor/InstructorClient";
import { CourseBuilderWizard } from "@/components/tutor/CourseBuilderWizard";

type Reply = { ok?: boolean; status?: number; body: unknown };
function mockFetch(...replies: Reply[]) {
  const queue = [...replies];
  const fn = vi.fn(async (_url?: unknown, _init?: RequestInit) => {
    const r = queue.length > 1 ? queue.shift()! : queue[0];
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.body } as Response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}
const sent = (fn: { mock: { calls: any[][] } }, i = -1) => {
  const [url, init] = fn.mock.calls.at(i)!;
  const body = (init as RequestInit | undefined)?.body;
  return { url: String(url), method: (init as RequestInit | undefined)?.method ?? "GET", body: typeof body === "string" ? JSON.parse(body) : undefined };
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => cleanup());

/* ───────────────────────────── grade review ───────────────────────────── */
describe("TutorSubmissionsReviewer", () => {
  const subs = () => [
    { id: "s1", courseTitle: "Biology 101", assignment: { title: "Quiz 1", maxScore: 100 }, student: { name: "Ada Student" }, submittedAt: "2026-05-01T10:00:00Z", content: "Plants make food from light.", score: 62, aiFeedback: "Mentions light but not chlorophyll.", tutorFeedback: null },
    { id: "s2", courseTitle: "Biology 101", assignment: { title: "Quiz 2", maxScore: 50 }, student: { name: "Bola Student" }, submittedAt: "2026-05-02T10:00:00Z", content: "No idea.", score: null, aiFeedback: null, tutorFeedback: "Please resubmit." },
  ];
  const card = (name: string) => screen.getByText(name).closest('[data-testid="submission-card"]') as HTMLElement;

  it("tells the instructor when there is nothing to review", () => {
    render(<TutorSubmissionsReviewer initialSubmissions={[]} />);
    expect(screen.getByText(/No student submissions yet/)).toBeTruthy();
  });

  it("shows each submission with the student's answer, score out of the right maximum, and the AI feedback", () => {
    render(<TutorSubmissionsReviewer initialSubmissions={subs()} />);
    expect(screen.getByText("62 / 100")).toBeTruthy();
    expect(screen.getByText("Ungraded")).toBeTruthy();
    expect(screen.getByText("Plants make food from light.")).toBeTruthy();
    expect(screen.getByText("Mentions light but not chlorophyll.")).toBeTruthy();
    expect(screen.getByText("Please resubmit.")).toBeTruthy(); // existing tutor note
  });

  it("opens an override form pre-filled with the current score and note, and can be cancelled", () => {
    render(<TutorSubmissionsReviewer initialSubmissions={subs()} />);
    fireEvent.click(within(card("Quiz 1")).getByText(/Override/));
    expect((screen.getByRole("spinbutton") as HTMLInputElement).value).toBe("62");
    fireEvent.click(screen.getByRole("button", { name: /Cancel/ }));
    expect(screen.queryByText("Tutor Grade Override")).toBeNull();
  });

  it("saves an override: sends score and note, then shows the new score", async () => {
    const fetchFn = mockFetch({ body: { success: true } });
    render(<TutorSubmissionsReviewer initialSubmissions={subs()} />);
    fireEvent.click(within(card("Quiz 1")).getByText(/Override/));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "88" } });
    fireEvent.change(screen.getByPlaceholderText("Explain your grade adjustment..."), { target: { value: "Good reasoning on chlorophyll" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Override/ }));

    expect(await screen.findByText("88 / 100")).toBeTruthy();
    expect(sent(fetchFn)).toEqual({ url: "/api/tutor/grade-override", method: "POST", body: { submissionId: "s1", newScore: 88, tutorFeedback: "Good reasoning on chlorophyll" } });
    expect(screen.getByText("Good reasoning on chlorophyll")).toBeTruthy();
    expect(screen.getByText(/Saved/)).toBeTruthy();
  });

  it("keeps the old score and shows the server's reason when the override is refused", async () => {
    mockFetch({ ok: false, status: 403, body: { error: "Access denied: You can only override grades for your own courses." } });
    render(<TutorSubmissionsReviewer initialSubmissions={subs()} />);
    fireEvent.click(within(card("Quiz 1")).getByText(/Override/));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Override/ }));
    expect(await screen.findByText(/only override grades for your own courses/)).toBeTruthy();
    expect(screen.getByText("62 / 100")).toBeTruthy();
  });
});

/* ───────────────────────────── announcements ───────────────────────────── */
describe("AnnouncementManager", () => {
  const courses = () => [
    { id: "c1", title: "Biology 101", announcements: [{ id: "a1", title: "Welcome", content: "Glad to have you.", createdAt: "2026-05-01T10:00:00Z" }] },
    { id: "c2", title: "Chemistry 101", announcements: [] },
  ];

  it("lists the selected course's announcements and switches when the course changes", () => {
    render(<AnnouncementManager courses={courses()} />);
    expect(screen.getByText("Welcome")).toBeTruthy();
    expect(screen.getByText(/Posted Announcements \(1\)/)).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "c2" } });
    expect(screen.queryByText("Welcome")).toBeNull();
    expect(screen.getByText(/No announcements posted for this course yet/)).toBeTruthy();
  });

  it("will not post until both title and message are filled", () => {
    render(<AnnouncementManager courses={courses()} />);
    const post = screen.getByRole("button", { name: /Post Announcement/ }) as HTMLButtonElement;
    expect(post.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Announcement title..."), { target: { value: "Exam" } });
    expect(post.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Write your announcement message here..."), { target: { value: "Monday" } });
    expect(post.disabled).toBe(false);
  });

  it("posts to the selected course and shows it at the top", async () => {
    const fetchFn = mockFetch({ body: { success: true, announcement: { id: "a2", title: "Exam moved", content: "See you Tuesday", createdAt: "2026-05-03T10:00:00Z" } } });
    render(<AnnouncementManager courses={courses()} />);
    fireEvent.change(screen.getByPlaceholderText("Announcement title..."), { target: { value: " Exam moved " } });
    fireEvent.change(screen.getByPlaceholderText("Write your announcement message here..."), { target: { value: "See you Tuesday" } });
    fireEvent.click(screen.getByRole("button", { name: /Post Announcement/ }));

    expect(await screen.findByText("Announcement posted successfully.")).toBeTruthy();
    expect(sent(fetchFn)).toEqual({ url: "/api/announcements", method: "POST", body: { courseId: "c1", title: "Exam moved", content: "See you Tuesday" } });
    expect(screen.getByText(/Posted Announcements \(2\)/)).toBeTruthy();
    expect((screen.getByPlaceholderText("Announcement title...") as HTMLInputElement).value).toBe(""); // form cleared
  });

  it("shows the server's error and keeps the draft", async () => {
    mockFetch({ ok: false, status: 403, body: { error: "You can only post announcements to your own courses." } });
    render(<AnnouncementManager courses={courses()} />);
    fireEvent.change(screen.getByPlaceholderText("Announcement title..."), { target: { value: "Hi" } });
    fireEvent.change(screen.getByPlaceholderText("Write your announcement message here..."), { target: { value: "There" } });
    fireEvent.click(screen.getByRole("button", { name: /Post Announcement/ }));
    expect(await screen.findByText(/only post announcements to your own courses/)).toBeTruthy();
    expect((screen.getByPlaceholderText("Announcement title...") as HTMLInputElement).value).toBe("Hi");
  });

  it("deletes an announcement", async () => {
    const fetchFn = mockFetch({ body: { success: true } });
    render(<AnnouncementManager courses={courses()} />);
    const item = screen.getByText("Welcome").closest("div.bg-slate-50") as HTMLElement;
    fireEvent.click(within(item).getByRole("button"));
    await waitFor(() => expect(screen.queryByText("Welcome")).toBeNull());
    expect(sent(fetchFn)).toMatchObject({ url: "/api/announcements?id=a1", method: "DELETE" });
  });
});

/* ───────────────────────────── instructor dashboard ───────────────────────────── */
describe("InstructorClient (instructor studio)", () => {
  const tutor = { id: "tut_1", name: "Dr Tutor", email: "tutor@test.com", role: "TUTOR", faculty: "Science", department: "Chemistry" };
  const tutorCourses = () => [
    {
      id: "c1", title: "Biology 101", category: "Science", faculty: "Science", department: "Chemistry", level: "Beginner", price: 15000, published: true, description: "d",
      modules: [{ id: "m1", title: "M1", lessons: [{ id: "l1", title: "L1", assignments: [] }] }],
      enrollments: [{ id: "e1", status: "ACTIVE", student: { name: "Ada Student", email: "ada@test.com", department: "Chemistry" } }, { id: "e2", status: "COMPLETED", student: { name: "Bola Student", email: "bola@test.com", department: null } }],
      announcements: [],
    },
  ];
  const metrics = { totalEnrollments: 2, publishedCourses: 1, totalSubmissions: 0, totalLessons: 1 };
  const studio = (initialTab: any = "dashboard") =>
    render(<InstructorClient currentUser={tutor} tutorCourses={tutorCourses()} allSubmissions={[]} metrics={metrics} initialTab={initialTab} />);

  it("opens on the dashboard", () => {
    studio();
    expect(screen.getAllByText(/Instructor Studio/).length).toBeGreaterThan(0);
  });

  it("navigates between the studio's sections", () => {
    studio();
    fireEvent.click(screen.getByRole("button", { name: /Students/ }));
    expect(screen.getByText("Enrolled Students")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Announcements/ }));
    expect(screen.getByText("Class Announcements")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Assignments/ }));
    expect(screen.getByText(/Student Submissions & Grading Queue/)).toBeTruthy();
  });

  it("keeps account settings under the profile: no Settings item in the studio menu, no repeated account card", () => {
    studio();
    expect(screen.queryByRole("button", { name: /^Settings$/ })).toBeNull();
  });

  it("the studio settings screen (opened from the profile) has no account card and links back to the profile", () => {
    studio("settings");
    expect(screen.getByText("Studio settings")).toBeTruthy();
    expect(screen.queryByText("Full Legal Name")).toBeNull();
    expect(screen.queryByText("Students Taught")).toBeNull();
    expect(screen.getByText("Back to profile").closest("a")!.getAttribute("href")).toBe("/profile");
  });

  it("shows honest empty states, not invented averages, when nothing has been graded", () => {
    const { container } = studio();
    const text = container.textContent!;
    expect(text).toContain("No grades yet");
    expect(text).toContain("No graded submissions yet");
    for (const fake of ["86%", "B+", "Fall Semester", "Week 6", "40%", "35%", "Period 1"]) {
      expect(text, fake).not.toContain(fake);
    }
  });

  it("shows the real average, letter, pass rate and grade split when work has been graded", () => {
    const { container } = render(
      <InstructorClient
        currentUser={tutor}
        tutorCourses={tutorCourses()}
        allSubmissions={[]}
        metrics={{ ...metrics, avgScore: 78, avgGradeLetter: "C", passRate: 75, gradeDistribution: { pctA: 25, pctB: 25, pctBelow80: 50 } }}
        initialTab="dashboard"
      />
    );
    const text = container.textContent!;
    expect(text).toContain("78% (C)");
    expect(text).toContain("75% Passing");
    expect(text).toContain("Cohort performance against the 70% pass mark");
    expect(text).toMatch(/Below 80%.*50%/);
  });

  it("never invents a pending-review count: an empty queue says so", () => {
    studio();
    expect(screen.getByText("Nothing is waiting for review right now.")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/12 submissions|Period 3|Good Afternoon/);
  });

  it("reports the real number of submissions waiting for review, with correct singular and plural", () => {
    const pending = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, score: null, courseTitle: "Biology 101", assignment: { title: "Q", maxScore: 100 }, student: { name: "S" }, content: "x" }));
    const one = render(<InstructorClient currentUser={tutor} tutorCourses={tutorCourses()} allSubmissions={pending(1)} metrics={metrics} />);
    expect(screen.getByText("1 submission")).toBeTruthy();
    one.unmount();
    render(<InstructorClient currentUser={tutor} tutorCourses={tutorCourses()} allSubmissions={pending(3)} metrics={metrics} />);
    expect(screen.getAllByText("3 submissions").length).toBeGreaterThan(0);
  });

  it("does not show a made-up average for a course nobody has been graded in", () => {
    const { container } = studio("dashboard");
    expect(container.textContent).toContain("no grades yet");
    expect(container.textContent).not.toMatch(/\d+% avg/);
  });

  it("lists every enrolled student with email, department and status", () => {
    studio("students");
    const ada = screen.getByText("Ada Student").closest("tr")!;
    expect(within(ada).getByText("ada@test.com")).toBeTruthy();
    expect(within(ada).getByText("Biology 101")).toBeTruthy();
    expect(within(ada).getByText("ACTIVE")).toBeTruthy();
    expect(within(screen.getByText("Bola Student").closest("tr")!).getByText("General")).toBeTruthy(); // no department
  });

  it("lists the instructor's own courses under My Classes", () => {
    studio("classes");
    expect(screen.getByText(/Existing Courses \(1\)/)).toBeTruthy();
    expect(screen.getByText("Biology 101")).toBeTruthy();
  });

  it("logs out via the API and returns to /login", async () => {
    const fetchFn = mockFetch({ body: { success: true } });
    const loc = { href: "", search: "", pathname: "/instructor" };
    vi.stubGlobal("location", loc);
    studio();
    fireEvent.click(screen.getAllByRole("button", { name: /Log ?out|Sign ?out/i })[0]);
    await waitFor(() => expect(loc.href).toBe("/login"));
    expect(sent(fetchFn).url).toBe("/api/auth/logout");
  });
});

/* ───────────────────────────── course builder ───────────────────────────── */
describe("CourseBuilderWizard", () => {
  const TITLE = "e.g. Advanced Next.js and Prisma Architecture";
  const DESC = "Describe what students will learn, key skills gained, and prerequisites...";

  const fillStep1 = (title = "Intro to Chemistry", description = "Learn the basics of chemistry.") => {
    fireEvent.change(screen.getByPlaceholderText(TITLE), { target: { value: title } });
    fireEvent.change(screen.getByPlaceholderText(DESC), { target: { value: description } });
  };
  const next = () => fireEvent.click(screen.getByRole("button", { name: /Continue to Modules/ }));

  it("will not move on until the course has a title and a description", () => {
    render(<CourseBuilderWizard />);
    const button = screen.getByRole("button", { name: /Continue to Modules/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(TITLE), { target: { value: "Only a title" } });
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(DESC), { target: { value: "Now with a description" } });
    expect(button.disabled).toBe(false);
  });

  it("starts with one module and one lesson, and lets the tutor add more", () => {
    render(<CourseBuilderWizard />);
    fillStep1();
    next();
    expect(screen.getByDisplayValue("Module 1: Foundations")).toBeTruthy();
    expect(screen.getAllByPlaceholderText(/Lesson \d title/)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Add Lesson/ }));
    expect(screen.getAllByPlaceholderText(/Lesson \d title/)).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Add Module/ }));
    expect(screen.getByPlaceholderText("Module 2 title")).toBeTruthy();
  });

  it("drafts an outline with the AI assistant and fills the modules from it", async () => {
    const fetchFn = mockFetch({ body: { success: true, outline: { modules: [{ title: "Atoms", lessons: [{ title: "Structure of the atom", content: "Protons, neutrons, electrons." }] }, { title: "Bonding", lessons: [{ title: "Ionic bonds" }] }] } } });
    render(<CourseBuilderWizard />);
    fireEvent.change(screen.getByPlaceholderText(/Enter a topic to auto-build modules/), { target: { value: "General Chemistry" } });
    fireEvent.click(screen.getByRole("button", { name: /Generate/ }));
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());
    expect(sent(fetchFn)).toEqual({ url: "/api/tutor/assistant", method: "POST", body: { action: "generate_outline", topic: "General Chemistry" } });
    expect((screen.getByPlaceholderText(TITLE) as HTMLInputElement).value).toBe("General Chemistry"); // title defaults to the topic
    fillStep1("General Chemistry", "Atoms and bonds.");
    next();
    expect(screen.getByDisplayValue("Atoms")).toBeTruthy();
    expect(screen.getByDisplayValue("Bonding")).toBeTruthy();
    expect(screen.getByDisplayValue("Structure of the atom")).toBeTruthy();
  });

  it("turns a pasted YouTube link into the embeddable form when you leave the video box", () => {
    render(<CourseBuilderWizard />);
    fillStep1();
    next();
    const box = screen.getByPlaceholderText(/Paste a YouTube link/) as HTMLInputElement;
    fireEvent.change(box, { target: { value: "https://youtu.be/dQw4w9WgXcQ?t=30" } });
    fireEvent.blur(box);
    expect(box.value).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ?start=30");
    fireEvent.change(box, { target: { value: "https://cdn.example.com/lecture.mp4" } });
    fireEvent.blur(box);
    expect(box.value).toBe("https://cdn.example.com/lecture.mp4");
  });

  it("explains in plain words what the assignment question and the marking guide are for", () => {
    render(<CourseBuilderWizard />);
    fillStep1();
    next();
    expect(screen.getByText("Assignment question")).toBeTruthy();
    expect(screen.getByText("Correct answer and marking guide")).toBeTruthy();
    expect(screen.getByText(/compared with this to give a score and feedback/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Write it for me" })).toBeTruthy();
  });

  const walkToReview = () => {
    fillStep1();
    next();
    fireEvent.change(screen.getByPlaceholderText("Lesson 1 title"), { target: { value: "What is matter?" } });
    fireEvent.change(screen.getByPlaceholderText("Key reading points, summary, and context..."), { target: { value: "Matter is anything with mass." } });
    fireEvent.change(screen.getByPlaceholderText(/Explain the core concepts covered in this lesson/), { target: { value: "Define matter." } });
    fireEvent.change(screen.getByPlaceholderText(/A full-mark answer defines the term/), { target: { value: "Matter has mass and takes up space." } });
    // "Review & Publish" is both a step tab and the bottom button; the bottom one is last in the DOM
    fireEvent.click(screen.getAllByRole("button", { name: /Review & Publish/ }).at(-1)!);
  };

  it("publishes: sends the whole course (info, modules, lessons, assignment and rubric) to the API", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchFn = mockFetch({ body: { success: true } });
    const onSuccess = vi.fn();
    render(<CourseBuilderWizard onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. 15000"), { target: { value: "12000" } });
    walkToReview();

    expect(screen.getByText("Step 3: Final Review & Publish")).toBeTruthy();
    expect(screen.getByText("Intro to Chemistry")).toBeTruthy();
    expect(screen.getByText(/1 assignments/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Publish Course" }));

    await screen.findByText(/published successfully/i);
    const req = sent(fetchFn);
    expect(req).toMatchObject({ url: "/api/tutor/courses", method: "POST" });
    expect(req.body).toMatchObject({ title: "Intro to Chemistry", description: "Learn the basics of chemistry.", price: 12000, level: "Beginner" });
    expect(req.body.modules[0].lessons[0]).toMatchObject({
      title: "What is matter?",
      content: "Matter is anything with mass.",
      assignmentPrompt: "Define matter.",
      assignmentReferenceAnswer: "Matter has mass and takes up space.",
    });
    expect(req.body).not.toHaveProperty("courseId");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("shows the server's error and lets the tutor try again", async () => {
    mockFetch({ ok: false, status: 400, body: { error: "At least one module is required." } });
    render(<CourseBuilderWizard />);
    walkToReview();
    fireEvent.click(screen.getByRole("button", { name: "Publish Course" }));
    expect(await screen.findByText("At least one module is required.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Publish Course" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("edits an existing course: pre-fills everything and saves with PUT and the course id", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchFn = mockFetch({ body: { success: true } });
    const existing = {
      id: "c1", title: "Biology 101", description: "Old description", faculty: "Science", department: "Chemistry", level: "Intermediate", price: 5000,
      modules: [{ title: "Cells", lessons: [{ title: "The cell", content: "c", videoUrl: "storage:t/v.mp4", resourceName: "Notes", resourceUrl: "storage:t/n.pdf", assignments: [{ prompt: "Describe a cell", referenceAnswer: "Has a membrane" }] }] }],
    };
    render(<CourseBuilderWizard initialCourse={existing} onSuccess={vi.fn()} />);
    expect((screen.getByPlaceholderText(TITLE) as HTMLInputElement).value).toBe("Biology 101");
    fireEvent.change(screen.getByPlaceholderText(DESC), { target: { value: "New description" } });
    next();
    expect(screen.getByDisplayValue("Cells")).toBeTruthy();
    expect(screen.getByDisplayValue("The cell")).toBeTruthy();
    expect(screen.getByDisplayValue("Describe a cell")).toBeTruthy();
    expect(screen.getByText(/Notes \(uploaded\)/)).toBeTruthy(); // private files are not shown as raw links
    fireEvent.click(screen.getByRole("button", { name: /Review & Update/ }));
    fireEvent.click(screen.getByRole("button", { name: /Save Changes & Notify Students/ }));

    await screen.findByText(/updated/i);
    const req = sent(fetchFn);
    expect(req).toMatchObject({ url: "/api/tutor/courses", method: "PUT" });
    expect(req.body).toMatchObject({ courseId: "c1", description: "New description" });
    expect(req.body.modules[0].lessons[0].videoUrl).toBe("storage:t/v.mp4"); // private references survive an edit
  });

  describe("file uploads", () => {
    const pick = (accept: string, file: File) => {
      const input = document.querySelector(`input[type="file"][accept*="${accept}"]`) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });
    };

    const UPLOAD_URL = "https://acct.r2.cloudflarestorage.com/course-uploads/tut_1/123_lecture.mp4?X-Amz-Signature=sig";
    const ticket = { success: true, uploadUrl: UPLOAD_URL, path: "tut_1/123_lecture.mp4", contentType: "video/mp4", url: "storage:tut_1/123_lecture.mp4", name: "lecture.mp4" };

    it("uploads a lesson video straight to storage and keeps only the private reference", async () => {
      const fetchFn = mockFetch({ body: ticket }, { body: {} });
      render(<CourseBuilderWizard />);
      fillStep1();
      next();

      const video = new File(["x"], "lecture.mp4", { type: "video/mp4" });
      const videoInput = document.querySelector('input[type="file"][accept*="video"]') as HTMLInputElement;
      fireEvent.change(videoInput, { target: { files: [video] } });

      await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
      expect(sent(fetchFn, 0)).toEqual({ url: "/api/tutor/upload", method: "POST", body: { fileName: "lecture.mp4", fileType: "video/mp4", fileSize: 1 } });
      const [putUrl, putInit] = fetchFn.mock.calls[1] as [string, RequestInit];
      expect(putUrl).toBe(UPLOAD_URL);
      expect(putInit.method).toBe("PUT");
      expect(putInit.headers).toEqual({ "Content-Type": "video/mp4" });
      expect(putInit.body).toBe(video);
      await waitFor(() => expect(screen.getByDisplayValue("storage:tut_1/123_lecture.mp4")).toBeTruthy());
    });

    it("uploads a cover image as a cover and shows it in the preview", async () => {
      const coverTicket = { success: true, uploadUrl: UPLOAD_URL, path: "covers/tut_1/1_ab_pic.png", contentType: "image/png", url: "/api/cover?key=covers%2Ftut_1%2F1_ab_pic.png", name: "pic.png" };
      const fetchFn = mockFetch({ body: coverTicket }, { body: {} });
      render(<CourseBuilderWizard />);
      pick("image", new File(["x"], "pic.png", { type: "image/png" }));
      await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
      expect(sent(fetchFn, 0).body).toEqual({ fileName: "pic.png", fileType: "image/png", fileSize: 1, purpose: "cover" });
      const preview = (await screen.findByAltText("Cover preview")) as HTMLImageElement;
      expect(preview.getAttribute("src")).toBe("/api/cover?key=covers%2Ftut_1%2F1_ab_pic.png");
    });

    it("shows the server's reason when a file type is refused, and uploads nothing", async () => {
      const fetchFn = mockFetch({ ok: false, status: 415, body: { error: 'File type "application/x-msdownload" is not allowed.' } });
      render(<CourseBuilderWizard />);
      fillStep1();
      next();
      const input = document.querySelector('input[type="file"][accept*="video"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [new File(["x"], "virus.exe", { type: "application/x-msdownload" })] } });
      expect(await screen.findByText(/is not allowed/)).toBeTruthy();
      expect(fetchFn).toHaveBeenCalledTimes(1); // only the ticket request; nothing was sent to storage
    });

    it("reports a refused upload to storage", async () => {
      mockFetch({ body: ticket }, { ok: false, status: 403, body: {} });
      render(<CourseBuilderWizard />);
      fillStep1();
      next();
      pick("video", new File(["x"], "v.mp4", { type: "video/mp4" }));
      expect(await screen.findByText(/storage error 403/)).toBeTruthy();
    });

    it("explains a blocked storage request (missing CORS rule) instead of showing 'Failed to fetch'", async () => {
      const fn = mockFetch({ body: ticket });
      fn.mockImplementationOnce(async () => ({ ok: true, status: 200, json: async () => ticket }) as Response);
      fn.mockImplementationOnce(async () => {
        throw new TypeError("Failed to fetch");
      });
      render(<CourseBuilderWizard />);
      fillStep1();
      next();
      pick("video", new File(["x"], "v.mp4", { type: "video/mp4" }));
      expect(await screen.findByText(/CORS/)).toBeTruthy();
    });
  });
});
