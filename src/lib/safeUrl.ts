/**
 * Lesson links are typed in by instructors and later shown to students, so they must never be able to
 * carry a `javascript:` (or `data:`) address: the page's security policy allows inline scripts, and a
 * link or an iframe pointing at one would run in a student's session. Only these are accepted.
 */
const STORAGE_PREFIX = "storage:"; // a private upload, resolved to a signed https link when a student opens the lesson
const VIDEO_EMBED_HOSTS = new Set(["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"]);
const VIDEO_FILE = /\.(mp4|webm|ogg|ogv)$/i;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** Whether an instructor may save this as a lesson's video or attached file. An empty value means "none". */
export function isSafeLessonUrl(value: unknown, kind: "video" | "resource"): boolean {
  if (value === undefined || value === null || value === "") return true;
  if (typeof value !== "string" || CONTROL_CHARS.test(value)) return false;
  if (value.startsWith(STORAGE_PREFIX)) return value.length > STORAGE_PREFIX.length;
  if (value.startsWith("/uploads/")) return true;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return kind === "resource" || VIDEO_EMBED_HOSTS.has(url.hostname) || VIDEO_FILE.test(url.pathname);
}

/** True when every lesson in a course's modules has safe video and file links. */
export function lessonLinksAreSafe(modules: unknown): boolean {
  if (!Array.isArray(modules)) return true;
  return modules.every(
    (m) =>
      !Array.isArray(m?.lessons) ||
      m.lessons.every((l: any) => isSafeLessonUrl(l?.videoUrl, "video") && isSafeLessonUrl(l?.resourceUrl, "resource"))
  );
}

/** What a page may put in an `src` or `href`: an https address or one of this site's own paths. */
export function isSafeRenderUrl(value: unknown): boolean {
  if (typeof value !== "string" || !value || CONTROL_CHARS.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export const LESSON_LINK_ERROR =
  "Lesson links must be https links (for video, a YouTube link or a video file) or files you uploaded.";
