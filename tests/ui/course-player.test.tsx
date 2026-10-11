// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/student/courses/course_1",
}));

import { CoursePlayerClient } from "@/app/student/courses/[courseId]/CoursePlayerClient";

type Reply = { ok?: boolean; status?: number; body: unknown };
type Routes = Record<string, Reply | ((init?: RequestInit) => Reply)>;
/** Fake backend: answers by "METHOD /path" and records every call. */
function backend(routes: Routes = {}) {
  const calls: Array<{ method: string; url: string; body?: any }> = [];
  const fn = vi.fn(async (url: unknown, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = String(url);
    calls.push({ method, url: path, body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
    const key = Object.keys(routes).find((k) => k === `${method} ${path}` || k === `${method} ${path.split("?")[0]}`);
    const r = key ? routes[key] : { body: method === "GET" ? { success: true, announcements: [] } : { success: true } };
    const reply = typeof r === "function" ? r(init) : r;
    return { ok: reply.ok ?? true, status: reply.status ?? 200, json: async () => reply.body } as Response;
  });
  vi.stubGlobal("fetch", fn);
  return { calls, fn, to: (method: string, url: string) => calls.filter((c) => c.method === method && c.url.startsWith(url)) };
}

const student = { id: "stu_1", name: "Ada Student", department: "Chemistry" };
const lesson = (n: number, over: Record<string, unknown> = {}) => ({
  id: `l${n}`,
  title: `Lesson ${n} title`,
  content: `Notes for lesson ${n}`,
  videoUrl: "",
  resourceName: "",
  resourceUrl: "",
  assignments: [],
  lessonProgress: [],
  discussionPosts: [],
  ...over,
});
const assignment = (over: Record<string, unknown> = {}) => ({
  id: "a1",
  title: "Quiz 1",
  prompt: "Explain osmosis.",
  maxScore: 100,
  submissions: [],
  ...over,
});
const course = (lessons = [lesson(1, { assignments: [assignment()] }), lesson(2), lesson(3)]) => ({
  id: "course_1",
  title: "Biology 101",
  category: "Science",
  faculty: "Science",
  department: "Chemistry",
  modules: [
    { id: "m1", title: "Module One", lessons: lessons.slice(0, 2) },
    { id: "m2", title: "Module Two", lessons: lessons.slice(2) },
  ],
});

const player = (c = course(), enrollment: any = { id: "enrollment-abcdef123456", status: "ACTIVE", completedAt: null }) =>
  render(<CoursePlayerClient course={c} enrollment={enrollment} student={student} />);

const lessonButton = (n: number) => screen.getAllByText(`Lesson ${n} title`).map((el) => el.closest("button")).find(Boolean) as HTMLButtonElement;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => cleanup());

describe("Course player: curriculum", () => {
  it("shows the course, its status and every lesson", () => {
    backend();
    player();
    expect(screen.getByRole("heading", { level: 1, name: "Biology 101" })).toBeTruthy();
    expect(screen.getAllByText("Module One").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Module Two").length).toBeGreaterThan(0);
    for (const n of [1, 2, 3]) expect(lessonButton(n)).toBeTruthy();
  });

  it("opens on the first lesson and shows its notes", () => {
    backend();
    player();
    expect(screen.getByText("Notes for lesson 1")).toBeTruthy();
  });

  it("locks each lesson until the one before it is completed", () => {
    backend();
    player();
    expect(lessonButton(1).disabled).toBe(false);
    expect(lessonButton(2).disabled).toBe(true);
    expect(lessonButton(3).disabled).toBe(true);
  });

  it("restores progress saved earlier (completed lessons unlock the next ones)", () => {
    backend();
    player(course([lesson(1, { lessonProgress: [{ completed: true }] }), lesson(2, { lessonProgress: [{ completed: true }] }), lesson(3)]));
    expect(lessonButton(2).disabled).toBe(false);
    expect(lessonButton(3).disabled).toBe(false);
  });
});

describe("Course player: lesson progress", () => {
  it("marking a lesson complete saves it, updates the button and unlocks the next lesson", async () => {
    const api = backend();
    player();
    fireEvent.click(screen.getByRole("button", { name: /Mark as Completed/ }));
    await waitFor(() => expect(api.to("POST", "/api/student/progress")).toHaveLength(1));
    expect(api.to("POST", "/api/student/progress")[0].body).toEqual({ lessonId: "l1", completed: true });
    expect(screen.getByRole("button", { name: /Lesson Completed/ })).toBeTruthy();
    expect(lessonButton(2).disabled).toBe(false);
  });

  it("can be undone", async () => {
    const api = backend();
    player(course([lesson(1, { lessonProgress: [{ completed: true }] }), lesson(2), lesson(3)]));
    fireEvent.click(screen.getByRole("button", { name: /Lesson Completed/ }));
    await waitFor(() => expect(api.to("POST", "/api/student/progress")).toHaveLength(1));
    expect(api.to("POST", "/api/student/progress")[0].body).toEqual({ lessonId: "l1", completed: false });
    expect(lessonButton(2).disabled).toBe(true);
  });

  it("'Next' completes the current lesson and moves on", async () => {
    const api = backend();
    player();
    fireEvent.click(screen.getByTitle("Next Lesson"));
    await waitFor(() => expect(screen.getByText("Notes for lesson 2")).toBeTruthy());
    expect(api.to("POST", "/api/student/progress")[0].body).toEqual({ lessonId: "l1", completed: true });
  });
});

describe("Course player: lesson media", () => {
  it("plays an uploaded video in a video element (signed link)", () => {
    backend();
    const { container } = player(course([lesson(1, { videoUrl: "https://proj.supabase.co/storage/signed/lecture.mp4?token=t" }), lesson(2), lesson(3)]));
    const video = container.querySelector("video")!;
    expect(video.getAttribute("src")).toBe("https://proj.supabase.co/storage/signed/lecture.mp4?token=t");
    expect(video.getAttribute("controlslist")).toBe("nodownload");
  });

  it("embeds a YouTube link in an iframe instead", () => {
    backend();
    const { container } = player(course([lesson(1, { videoUrl: "https://www.youtube.com/embed/abc123" }), lesson(2), lesson(3)]));
    expect(container.querySelector("iframe")!.getAttribute("src")).toBe("https://www.youtube.com/embed/abc123");
    expect(container.querySelector("video")).toBeNull();
  });

  it("offers an attached resource as a download link", () => {
    backend();
    player(course([lesson(1, { resourceName: "Lecture notes.pdf", resourceUrl: "https://proj.supabase.co/storage/signed/notes.pdf?token=t" }), lesson(2), lesson(3)]));
    const link = screen.getByText("Lecture notes.pdf").closest("a")!;
    expect(link.getAttribute("href")).toContain("notes.pdf");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("shows no video or resource blocks for a lesson without them", () => {
    backend();
    const { container } = player();
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.queryByText("Downloadable Resource")).toBeNull();
  });
});

describe("Course player: assignments and grading", () => {
  const answer = (text = "Water moves across a membrane from low to high solute concentration.") =>
    fireEvent.change(screen.getByPlaceholderText("Type your answer here..."), { target: { value: text } });

  it("shows the question and keeps Submit disabled until there is an answer", () => {
    backend();
    player();
    expect(screen.getByText("Explain osmosis.")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Submit Assignment/ }) as HTMLButtonElement).disabled).toBe(true);
    answer();
    expect((screen.getByRole("button", { name: /Submit Assignment/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("submits the answer for grading and shows the score and feedback", async () => {
    const api = backend({
      "POST /api/grade": { body: { success: true, submission: { id: "sub_1", score: 85, aiFeedback: "Good grasp of the concept.", tutorFeedback: null, content: "Water moves..." } } },
    });
    player();
    answer("Water moves...");
    fireEvent.click(screen.getByRole("button", { name: /Submit Assignment/ }));

    expect(await screen.findByText("Score: 85 / 100")).toBeTruthy();
    expect(screen.getByText("Good grasp of the concept.")).toBeTruthy();
    expect(api.to("POST", "/api/grade")[0].body).toEqual({ assignmentId: "a1", content: "Water moves..." });
  });

  it("submitting counts the lesson as completed", async () => {
    const api = backend({ "POST /api/grade": { body: { success: true, submission: { id: "s", score: 70, aiFeedback: "ok", content: "x" } } } });
    player();
    answer("x");
    fireEvent.click(screen.getByRole("button", { name: /Submit Assignment/ }));
    await screen.findByText("Score: 70 / 100");
    await waitFor(() => expect(api.to("POST", "/api/student/progress")).toHaveLength(1));
    expect(api.to("POST", "/api/student/progress")[0].body).toEqual({ lessonId: "l1", completed: true });
  });

  it("shows an instructor's override note alongside the AI feedback", async () => {
    backend();
    player(
      course([
        lesson(1, { assignments: [assignment({ submissions: [{ id: "s", score: 90, content: "My answer", aiFeedback: "Automated feedback", tutorFeedback: "Great work, bumped to 90." }] })] }),
        lesson(2),
        lesson(3),
      ])
    );
    expect(screen.getByText("Score: 90 / 100")).toBeTruthy();
    expect(screen.getByText("Automated feedback")).toBeTruthy();
    expect(screen.getByText("Great work, bumped to 90.")).toBeTruthy();
  });

  it("lets the student revise and resubmit, pre-filling their earlier answer", async () => {
    const api = backend({ "POST /api/grade": { body: { success: true, submission: { id: "s", score: 95, aiFeedback: "Much better", content: "Better answer" } } } });
    player(course([lesson(1, { assignments: [assignment({ submissions: [{ id: "s", score: 60, content: "First try", aiFeedback: "Needs detail", tutorFeedback: null }] })] }), lesson(2), lesson(3)]));
    fireEvent.click(screen.getByRole("button", { name: /Revise Answer/ }));
    const box = screen.getByPlaceholderText("Type your answer here...") as HTMLTextAreaElement;
    expect(box.value).toBe("First try");
    fireEvent.change(box, { target: { value: "Better answer" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Revised Answer/ }));
    expect(await screen.findByText("Score: 95 / 100")).toBeTruthy();
    expect(api.to("POST", "/api/grade")[0].body).toEqual({ assignmentId: "a1", content: "Better answer" });
  });

  it("can cancel a revision and keeps the earlier score", () => {
    backend();
    player(course([lesson(1, { assignments: [assignment({ submissions: [{ id: "s", score: 60, content: "First try", aiFeedback: "x" }] })] }), lesson(2), lesson(3)]));
    fireEvent.click(screen.getByRole("button", { name: /Revise Answer/ }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel Revision/ }));
    expect(screen.getByText("Score: 60 / 100")).toBeTruthy();
  });

  it("TELLS the student when grading fails instead of failing silently (for example the rate limit)", async () => {
    backend({ "POST /api/grade": { ok: false, status: 429, body: { error: "Too many requests. Please slow down and try again in 240 seconds." } } });
    player();
    answer();
    fireEvent.click(screen.getByRole("button", { name: /Submit Assignment/ }));
    expect(await screen.findByText(/Too many requests/)).toBeTruthy();
    expect((screen.getByPlaceholderText("Type your answer here...") as HTMLTextAreaElement).value).not.toBe(""); // the answer is not lost
    expect((screen.getByRole("button", { name: /Submit Assignment/ }) as HTMLButtonElement).disabled).toBe(false); // can retry
  });

  it("tells the student when the server cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: unknown) => {
      if (String(url).startsWith("/api/announcements")) return { ok: true, json: async () => ({ success: true, announcements: [] }) } as Response;
      throw new Error("Failed to fetch");
    }));
    player();
    answer();
    fireEvent.click(screen.getByRole("button", { name: /Submit Assignment/ }));
    expect(await screen.findByText(/could not reach the server|Failed to fetch/i)).toBeTruthy();
  });
});

describe("Course player: finishing the course and the certificate", () => {
  it("asks the server to complete the course and shows its reason when criteria are not met", async () => {
    const api = backend({ "POST /api/courses/complete": { ok: false, status: 400, body: { error: "Course completion locked: Your current average score is 62%. A minimum passing score of 70% across all assignments is required." } } });
    player();
    fireEvent.click(screen.getByRole("button", { name: /Complete Course & Release Lock/ }));
    expect(await screen.findByText(/average score is 62%/)).toBeTruthy();
    expect(api.to("POST", "/api/courses/complete")[0].body).toEqual({ courseId: "course_1" });
    expect(screen.queryByText("Course Completed")).toBeNull();
  });

  it("on success shows 'Course Completed' and the certificate button", async () => {
    backend({ "POST /api/courses/complete": { body: { success: true } } });
    player();
    fireEvent.click(screen.getByRole("button", { name: /Complete Course & Release Lock/ }));
    expect(await screen.findByText("Course Completed")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Certificate/ })).toBeTruthy();
  });

  describe("certificate", () => {
    const completed = { id: "enrollment-abcdef123456", status: "COMPLETED", completedAt: "2026-05-20T10:00:00Z" };
    const openCertificate = () => {
      backend();
      player(course(), completed);
      fireEvent.click(screen.getByRole("button", { name: /Certificate/ }));
    };

    it("is not offered until the course is completed", () => {
      backend();
      player();
      expect(screen.queryByRole("button", { name: /Certificate/ })).toBeNull();
    });

    it("names the student and course, with an ID derived from the enrollment", () => {
      openCertificate();
      expect(screen.getByRole("heading", { name: "Certificate of Completion" })).toBeTruthy();
      expect(screen.getAllByText("Ada Student").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Biology 101").length).toBeGreaterThan(0);
      expect(screen.getByText("CERT-EF123456")).toBeTruthy();
      expect(screen.getByText("Certificate ID")).toBeTruthy();
    });

    it("is issued by Academia LMS and makes no claims about boards, seals or degrees", () => {
      openCertificate();
      const text = document.body.textContent!;
      expect(text).toContain("Academia LMS");
      for (const claim of ["Examination Board", "Institutional Seal", "SEAL", "Directorate", "Polytechnic", "Official Academic"]) {
        expect(text, claim).not.toContain(claim);
      }
    });

    it("can be printed and closed", () => {
      const print = vi.fn();
      vi.stubGlobal("print", print);
      openCertificate();
      fireEvent.click(screen.getByRole("button", { name: /Print/i }));
      expect(print).toHaveBeenCalled();
      fireEvent.click(screen.getAllByRole("button", { name: /Close|^$/ }).find((b) => b.querySelector("svg") && !b.textContent!.trim()) ?? screen.getByRole("button", { name: /Close/ }));
    });
  });
});

describe("Course player: discussion", () => {
  const post = { id: "p1", content: "How does osmosis differ from diffusion?", createdAt: "2026-05-01T10:00:00Z", user: { name: "Bola Student", role: "STUDENT" }, replies: [{ id: "r1", content: "Osmosis is about water only.", createdAt: "2026-05-01T11:00:00Z", user: { name: "Dr Tutor", role: "TUTOR" } }] };

  it("shows existing posts with their replies", () => {
    backend();
    player(course([lesson(1, { discussionPosts: [post] }), lesson(2), lesson(3)]));
    expect(screen.getByText("How does osmosis differ from diffusion?")).toBeTruthy();
    expect(screen.getByText("Osmosis is about water only.")).toBeTruthy();
  });

  it("posts a new question to the current lesson", async () => {
    const api = backend({ "POST /api/student/discussion": { body: { success: true, post: { id: "p2", content: "What is a hypertonic solution?", createdAt: "2026-05-02T10:00:00Z", user: { name: "Ada Student", role: "STUDENT" }, replies: [] } } } });
    player();
    fireEvent.change(screen.getByPlaceholderText("Ask a question or share a thought about this lesson..."), { target: { value: "What is a hypertonic solution?" } });
    fireEvent.click(screen.getByRole("button", { name: /Post/ }));
    expect(await screen.findByText("What is a hypertonic solution?")).toBeTruthy();
    expect(api.to("POST", "/api/student/discussion")[0].body).toEqual({ action: "create_post", lessonId: "l1", content: "What is a hypertonic solution?" });
  });

  it("replies to a post", async () => {
    const api = backend({ "POST /api/student/discussion": { body: { success: true, reply: { id: "r2", content: "Thanks, that helps!", createdAt: "2026-05-02T10:00:00Z", user: { name: "Ada Student", role: "STUDENT" } } } } });
    player(course([lesson(1, { discussionPosts: [post] }), lesson(2), lesson(3)]));
    fireEvent.change(screen.getByPlaceholderText("Write a reply..."), { target: { value: "Thanks, that helps!" } });
    fireEvent.click(screen.getByRole("button", { name: /Reply/ }));
    expect(await screen.findByText("Thanks, that helps!")).toBeTruthy();
    expect(api.to("POST", "/api/student/discussion")[0].body).toEqual({ action: "create_reply", postId: "p1", content: "Thanks, that helps!" });
  });
});

describe("Course player: announcements", () => {
  it("loads the course's announcements from the API and shows them", async () => {
    const api = backend({ "GET /api/announcements": { body: { success: true, announcements: [{ id: "n1", title: "Exam moved", content: "See you Tuesday", createdAt: "2026-05-01T10:00:00Z" }] } } });
    player();
    expect(await screen.findByText("Exam moved")).toBeTruthy();
    expect(screen.getByText("See you Tuesday")).toBeTruthy();
    expect(api.calls[0].url).toBe("/api/announcements?courseId=course_1");
  });

  it("copes with the announcements request failing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    player();
    expect(screen.getByRole("heading", { level: 1, name: "Biology 101" })).toBeTruthy(); // the page still works
  });
});
