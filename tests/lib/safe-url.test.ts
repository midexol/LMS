import { describe, it, expect } from "vitest";
import { isSafeLessonUrl, lessonLinksAreSafe, isSafeRenderUrl } from "@/lib/safeUrl";

const DANGEROUS = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  " javascript:alert(1)",
  "java\tscript:alert(1)",
  "java\nscript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "http://example.com/notes.pdf",
  "//evil.example/x",
  "ftp://example.com/a",
  "storage:",
  "/etc/passwd",
  "https://",
  42,
  {},
  ["https://example.com"],
];

describe("isSafeLessonUrl", () => {
  it("allows nothing at all (no video, no file)", () => {
    for (const kind of ["video", "resource"] as const) {
      expect(isSafeLessonUrl("", kind)).toBe(true);
      expect(isSafeLessonUrl(undefined, kind)).toBe(true);
      expect(isSafeLessonUrl(null, kind)).toBe(true);
    }
  });

  it("allows the app's own uploads and https links", () => {
    expect(isSafeLessonUrl("storage:tutor_1/lecture.mp4", "video")).toBe(true);
    expect(isSafeLessonUrl("/uploads/lecture.mp4", "video")).toBe(true);
    expect(isSafeLessonUrl("https://www.youtube.com/embed/abc123", "video")).toBe(true);
    expect(isSafeLessonUrl("https://www.youtube-nocookie.com/embed/abc123", "video")).toBe(true);
    expect(isSafeLessonUrl("https://cdn.example.com/lecture.mp4", "video")).toBe(true);
    expect(isSafeLessonUrl("https://example.com/notes.pdf", "resource")).toBe(true);
  });

  it("for video, refuses an https page that is neither a YouTube embed nor a video file", () => {
    expect(isSafeLessonUrl("https://evil.example/page", "video")).toBe(false);
    expect(isSafeLessonUrl("https://youtube.evil.example/embed/x", "video")).toBe(false);
  });

  it.each(DANGEROUS.map((d) => [typeof d === "string" ? d : JSON.stringify(d), d] as const))(
    "refuses %s for both video and files",
    (_label, value) => {
      expect(isSafeLessonUrl(value, "video")).toBe(false);
      expect(isSafeLessonUrl(value, "resource")).toBe(false);
    }
  );
});

describe("lessonLinksAreSafe", () => {
  const course = (lesson: Record<string, unknown>) => [{ title: "M", lessons: [{ title: "A" }, lesson] }];

  it("accepts a course with safe or empty links, and anything that is not a module list", () => {
    expect(lessonLinksAreSafe(course({ title: "B", videoUrl: "storage:x/y.mp4", resourceUrl: "https://example.com/a.pdf" }))).toBe(true);
    expect(lessonLinksAreSafe(undefined)).toBe(true);
    expect(lessonLinksAreSafe([{ title: "no lessons" }])).toBe(true);
  });

  it("rejects the whole course when any one lesson has a dangerous video or file link", () => {
    expect(lessonLinksAreSafe(course({ title: "B", videoUrl: "javascript:alert(1)" }))).toBe(false);
    expect(lessonLinksAreSafe(course({ title: "B", resourceUrl: "javascript:alert(1)" }))).toBe(false);
  });
});

describe("isSafeRenderUrl", () => {
  it("allows https and this site's own paths only", () => {
    expect(isSafeRenderUrl("https://proj.supabase.co/storage/signed/a.mp4?token=t")).toBe(true);
    expect(isSafeRenderUrl("/uploads/a.mp4")).toBe(true);
    for (const bad of ["", undefined, null, "javascript:alert(1)", "data:text/html,x", "http://a.example", "//evil.example", 5]) {
      expect(isSafeRenderUrl(bad)).toBe(false);
    }
  });
});
