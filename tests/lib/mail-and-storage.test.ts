import { describe, it, expect, vi, beforeEach } from "vitest";

/* ───────── Mail: the real module, with a fake SMTP transport ───────── */
const smtp = vi.hoisted(() => ({ sent: [] as any[], fail: false }));
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: async (msg: any) => {
        if (smtp.fail) throw new Error("SMTP down");
        smtp.sent.push(msg);
      },
    }),
  },
}));

/* ───────── Storage: fake Supabase client ───────── */
const supa = vi.hoisted(() => ({
  signed: vi.fn(),
  created: [] as any[],
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: any[]) => {
    supa.created.push(args);
    return { storage: { from: () => ({ createSignedUrl: supa.signed }) } };
  },
}));

async function realMail(withSmtp = true) {
  vi.resetModules();
  if (withSmtp) {
    vi.stubEnv("SMTP_HOST", "smtp.real.test");
    vi.stubEnv("SMTP_USER", "mailer");
    vi.stubEnv("SMTP_PASS", "secret");
    vi.stubEnv("SMTP_FROM", "ACADEMIA <noreply@lms.test>");
  }
  return vi.importActual<typeof import("@/lib/mail")>("@/lib/mail");
}

beforeEach(() => {
  smtp.sent = [];
  smtp.fail = false;
  supa.signed.mockReset();
  supa.created = [];
});

describe("email sending", () => {
  it("sends through SMTP with the configured From address", async () => {
    const mail = await realMail();
    expect(await mail.sendEnrollmentEmail("ada@test.com", { studentName: "Ada", courseTitle: "Chemistry" })).toBe(true);
    expect(smtp.sent).toHaveLength(1);
    expect(smtp.sent[0]).toMatchObject({ to: "ada@test.com", from: "ACADEMIA <noreply@lms.test>" });
    expect(smtp.sent[0].subject).toBeTruthy();
    expect(smtp.sent[0].html).toContain("Chemistry");
  });

  it("returns false (never throws) when SMTP fails, so a mail outage cannot break a request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mail = await realMail();
    smtp.fail = true;
    expect(await mail.sendGradeEmail("a@test.com", { studentName: "A", courseTitle: "C", assignmentTitle: "T", score: 1, maxScore: 2, feedback: "f" })).toBe(false);
  });

  it("without SMTP credentials it logs instead of sending and still reports success", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const mail = await realMail(false);
    expect(await mail.sendEmailNotification("a@test.com", "Subject", "<p>Hi</p>")).toBe(true);
    expect(smtp.sent).toHaveLength(0);
    expect(log).toHaveBeenCalled();
  });

  it("ignores placeholder credentials like smtp.example.com", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_USER", "user@example.com");
    vi.stubEnv("SMTP_PASS", "password");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.resetModules();
    const mail = await vi.importActual<typeof import("@/lib/mail")>("@/lib/mail");
    await mail.sendEmailNotification("a@test.com", "S", "<p>x</p>");
    expect(smtp.sent).toHaveLength(0);
  });

  it("HTML-escapes user-supplied text so a malicious name cannot inject markup", async () => {
    const mail = await realMail();
    await mail.sendGradeEmail("a@test.com", {
      studentName: '<script>alert("x")</script>',
      courseTitle: "Chem <b>101</b>",
      assignmentTitle: "Quiz & Test",
      score: 5,
      maxScore: 10,
      feedback: '<img src=x onerror="steal()">',
    });
    const html: string = smtp.sent[0].html;
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>101</b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Quiz &amp; Test");
  });

  it("escapes names in account emails too (verification, reset, welcome)", async () => {
    const mail = await realMail();
    const evil = "<i>Eve</i>";
    await mail.sendVerificationEmail("a@test.com", { userName: evil, verifyUrl: "https://lms.test/verify-email?token=abc" });
    await mail.sendPasswordResetEmail("a@test.com", { userName: evil, resetUrl: "https://lms.test/reset-password?token=abc" });
    await mail.sendWelcomeEmail("a@test.com", { userName: evil, dashboardUrl: "https://lms.test/my-courses" });
    for (const msg of smtp.sent) {
      expect(msg.html).not.toContain("<i>Eve</i>");
      expect(msg.html).toContain("&lt;i&gt;Eve&lt;/i&gt;");
    }
  });

  it("leaves links intact (fields ending in Url are server-generated, not escaped)", async () => {
    const mail = await realMail();
    const url = "https://lms.test/reset-password?token=abc&x=1";
    await mail.sendPasswordResetEmail("a@test.com", { userName: "Ada", resetUrl: url });
    expect(smtp.sent[0].html).toContain(`href="${url}"`);
  });

  it("keeps the subject as plain text (not HTML-escaped)", async () => {
    const mail = await realMail();
    await mail.sendAnnouncementEmail("a@test.com", { studentName: "A", courseTitle: "R&D <Lab>", announcementTitle: "Exam & Quiz", content: "c" });
    expect(smtp.sent[0].subject).not.toContain("&amp;");
  });

  it("sends the instructor invite with the set-password link and sign-in page", async () => {
    const mail = await realMail();
    await mail.sendInstructorInviteEmail("tutor@test.com", {
      userName: "Dr. Ade",
      inviteUrl: "https://lms.test/reset-password?token=INVITE",
      loginUrl: "https://lms.test/instructor/login",
    });
    expect(smtp.sent[0].subject).toMatch(/instructor/i);
    expect(smtp.sent[0].html).toContain("https://lms.test/reset-password?token=INVITE");
    expect(smtp.sent[0].html).toContain("https://lms.test/instructor/login");
    expect(smtp.sent[0].html).toContain("3 days");
  });

  it("every email type renders without leaving template placeholders", async () => {
    const mail = await realMail();
    await mail.sendEnrollmentEmail("a@t.com", { studentName: "A", courseTitle: "C" });
    await mail.sendGradeEmail("a@t.com", { studentName: "A", courseTitle: "C", assignmentTitle: "T", score: 7, maxScore: 10, feedback: "f" });
    await mail.sendGradeOverrideEmail("a@t.com", { studentName: "A", courseTitle: "C", assignmentTitle: "T", newScore: 9, maxScore: 10, tutorFeedback: "tf" });
    await mail.sendCourseUpdateEmail("a@t.com", { studentName: "A", courseTitle: "C", updateSummary: "u" });
    await mail.sendCompletionEmail("a@t.com", { studentName: "A", courseTitle: "C", certificateId: "CERT-1234" });
    expect(smtp.sent).toHaveLength(5);
    for (const msg of smtp.sent) {
      expect(msg.html).not.toMatch(/\$\{|undefined|\[object Object\]/);
      expect(msg.subject).not.toMatch(/undefined/);
    }
    expect(smtp.sent[4].html).toContain("CERT-1234");
  });
});

describe("private lesson media (storage)", () => {
  async function storage() {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    return import("@/lib/storage");
  }

  it("passes ordinary links (YouTube embeds) through unchanged", async () => {
    const { resolveStorageUrl } = await storage();
    expect(await resolveStorageUrl("https://www.youtube.com/embed/abc")).toBe("https://www.youtube.com/embed/abc");
    expect(supa.signed).not.toHaveBeenCalled();
  });

  it("returns an empty string for empty values", async () => {
    const { resolveStorageUrl } = await storage();
    expect(await resolveStorageUrl("")).toBe("");
    expect(await resolveStorageUrl(null)).toBe("");
    expect(await resolveStorageUrl(undefined)).toBe("");
  });

  it("turns a storage: reference into a short-lived signed URL (2 hours)", async () => {
    const { resolveStorageUrl } = await storage();
    supa.signed.mockResolvedValue({ data: { signedUrl: "https://proj.supabase.co/signed/abc?token=t" }, error: null });
    expect(await resolveStorageUrl("storage:tutor_1/123_video.mp4")).toBe("https://proj.supabase.co/signed/abc?token=t");
    expect(supa.signed).toHaveBeenCalledWith("tutor_1/123_video.mp4", 7200);
  });

  it("returns an empty string (never a broken or public link) when signing fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { resolveStorageUrl } = await storage();
    supa.signed.mockResolvedValue({ data: null, error: { message: "Object not found" } });
    expect(await resolveStorageUrl("storage:missing.mp4")).toBe("");
  });

  it("uses the service-role key only on the server client", async () => {
    const { getStorageAdmin } = await storage();
    getStorageAdmin();
    expect(supa.created[0][0]).toBe("https://proj.supabase.co");
    expect(supa.created[0][1]).toBe("service-key");
  });

  it("errors clearly when Supabase is not configured", async () => {
    vi.resetModules();
    const { getStorageAdmin } = await import("@/lib/storage");
    expect(() => getStorageAdmin()).toThrow(/not configured/i);
  });
});
