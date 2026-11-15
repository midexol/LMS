import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "../helpers/http";

const storage = vi.hoisted(() => ({ resolveStorageUrl: vi.fn() }));
vi.mock("@/lib/storage", () => ({
  STORAGE_REF_PREFIX: "storage:",
  resolveStorageUrl: storage.resolveStorageUrl,
}));

import { GET } from "@/app/api/cover/route";

const get = (key?: string) => GET(makeRequest(`/api/cover${key === undefined ? "" : `?key=${encodeURIComponent(key)}`}`, { method: "GET" }));

describe("GET /api/cover (public course cover pictures)", () => {
  beforeEach(() => {
    storage.resolveStorageUrl.mockReset();
    storage.resolveStorageUrl.mockImplementation(async (ref: string) => `https://acct.r2.cloudflarestorage.com/course-uploads/${ref.slice(8)}?X-Amz-Signature=sig`);
  });

  it("redirects to a short-lived signed link for a cover, with no sign-in needed", async () => {
    const res = await get("covers/tutor_1/123_abcd1234_Biology.png");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("r2.cloudflarestorage.com/course-uploads/covers/tutor_1/123_abcd1234_Biology.png");
    expect(res.headers.get("cache-control")).toBe("public, max-age=900");
    expect(storage.resolveStorageUrl).toHaveBeenCalledWith("storage:covers/tutor_1/123_abcd1234_Biology.png");
  });

  it("never hands out lesson videos, files or anything outside covers/", async () => {
    for (const key of [
      "tutor_1/123_abcd1234_lecture.mp4",
      "tutor_1/123_abcd1234_notes.pdf",
      "covers/tutor_1/123_abcd1234_lecture.mp4",
      "covers/../tutor_1/secret.png",
      "covers/tutor_1/../../x.png",
      "covers//x.png",
      "covers/tutor_1/a/b.png",
      "",
    ]) {
      const res = await get(key);
      expect(res.status, key).toBe(404);
    }
    expect((await get()).status).toBe(404);
    expect(storage.resolveStorageUrl).not.toHaveBeenCalled();
  });

  it("answers 404 when the file cannot be signed", async () => {
    storage.resolveStorageUrl.mockResolvedValue("");
    expect((await get("covers/tutor_1/123_abcd1234_Biology.png")).status).toBe(404);
  });
});
