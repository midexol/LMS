/**
 * Lesson links are typed in by instructors and later shown to students, so they must never be able to
 * carry a `javascript:` (or `data:`) address: the page's security policy allows inline scripts, and a
 * link or an iframe pointing at one would run in a student's session. Only these are accepted.
 */
const STORAGE_PREFIX = "storage:"; // a private upload, resolved to a signed https link when a student opens the lesson
const VIDEO_EMBED_HOSTS = new Set(["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"]);
const VIDEO_FILE = /\.(mp4|webm|ogg|ogv)$/i;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be"]);

/** "90", "90s" or "1m30s" (as in a YouTube share link's `t=`) to whole seconds, or 0 when it is not a time. */
function youtubeStartSeconds(raw: string | null): number {
  if (!raw) return 0;
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(raw.trim());
  if (!m) return 0;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

/**
 * Turns any ordinary YouTube link (the address bar's watch link, a youtu.be share link, a Shorts or live link)
 * into the embed link that can be shown inside a lesson. YouTube refuses to load watch pages inside another site,
 * so a pasted watch link would otherwise show up as a blank "refused to connect" box. Anything that is not a
 * recognisable single-video YouTube link (a file, another site, an existing embed link) is returned unchanged.
 */
export function toYouTubeEmbedUrl(value: string): string {
  if (typeof value !== "string") return value;
  let text = value.trim();
  if (/^(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(text)) text = `https://${text}`;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return value;
  }
  if (url.protocol !== "https:" || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return value;

  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (url.hostname.toLowerCase().endsWith("youtu.be")) id = parts[0] ?? null;
  else if (parts[0] === "watch") id = url.searchParams.get("v");
  else if (["shorts", "live", "v"].includes(parts[0])) id = parts[1] ?? null;
  if (!id || !YOUTUBE_ID.test(id)) return value;

  const start = youtubeStartSeconds(url.searchParams.get("t") ?? url.searchParams.get("start"));
  return `https://www.youtube.com/embed/${id}${start > 0 ? `?start=${start}` : ""}`;
}

/** Gives every lesson's video link the embeddable form (see toYouTubeEmbedUrl) before it is checked and saved. */
export function withEmbeddableVideos<T>(modules: T): T {
  if (!Array.isArray(modules)) return modules;
  return modules.map((m: any) =>
    m && Array.isArray(m.lessons)
      ? { ...m, lessons: m.lessons.map((l: any) => (l && typeof l.videoUrl === "string" ? { ...l, videoUrl: toYouTubeEmbedUrl(l.videoUrl) } : l)) }
      : m
  ) as unknown as T;
}

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
