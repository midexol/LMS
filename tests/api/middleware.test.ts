import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function run(path: string, cookies: Record<string, string> = {}) {
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  const req = new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie } : {} });
  const res = middleware(req);
  const location = res.headers.get("location");
  return {
    redirected: res.status >= 300 && res.status < 400,
    to: location ? new URL(location) : null,
    passes: res.headers.get("x-middleware-next") === "1",
  };
}

const as = (role: string) => ({ lms_user_id: "token", lms_user_role: role });

describe("route protection middleware", () => {
  describe("student pages", () => {
    it.each(["/student/courses/abc", "/profile", "/my-courses", "/onboarding"])("%s sends visitors to login and remembers where they were going", (path) => {
      const r = run(path);
      expect(r.redirected).toBe(true);
      expect(r.to!.pathname).toBe("/login");
      expect(r.to!.searchParams.get("redirect")).toBe(path);
    });

    it.each(["/student/courses/abc", "/profile", "/my-courses", "/onboarding"])("%s lets signed-in users through", (path) => {
      expect(run(path, as("STUDENT")).passes).toBe(true);
    });
  });

  describe("instructor area", () => {
    it("sends visitors to the instructor login", () => {
      const r = run("/instructor");
      expect(r.to!.pathname).toBe("/instructor/login");
    });

    it("keeps students out", () => {
      expect(run("/instructor", as("STUDENT")).to!.pathname).toBe("/my-courses");
    });

    it("lets tutors and admins in", () => {
      expect(run("/instructor", as("TUTOR")).passes).toBe(true);
      expect(run("/instructor", as("ADMIN")).passes).toBe(true);
    });

    it("keeps the login page itself public", () => {
      expect(run("/instructor/login").passes).toBe(true);
    });
  });

  describe("admin area", () => {
    it("sends visitors to the admin login", () => {
      expect(run("/admin").to!.pathname).toBe("/admin/login");
      expect(run("/admin/users/abc").to!.pathname).toBe("/admin/login");
    });

    it("keeps students and tutors out", () => {
      expect(run("/admin", as("STUDENT")).to!.pathname).toBe("/my-courses");
      expect(run("/admin", as("TUTOR")).to!.pathname).toBe("/instructor");
    });

    it("lets admins in, and keeps the login page public", () => {
      expect(run("/admin", as("ADMIN")).passes).toBe(true);
      expect(run("/admin/users/abc", as("SUPERADMIN")).passes).toBe(true);
      expect(run("/admin/login").passes).toBe(true);
    });
  });

  describe("public pages and assets", () => {
    it.each(["/", "/login", "/signup", "/courses", "/terms", "/privacy", "/forgot-password", "/reset-password", "/verify-email", "/payment/verify"])(
      "%s is open to everyone",
      (path) => {
        expect(run(path).passes).toBe(true);
      }
    );

    it.each(["/api/grade", "/api/payment/webhook", "/_next/static/chunk.js", "/logo.svg", "/hero.png", "/photo.jpg", "/font.woff2", "/favicon.ico", "/icon.svg"])(
      "%s is never redirected (APIs do their own checks, so Paystack's webhook works)",
      (path) => {
        expect(run(path).passes).toBe(true);
      }
    );
  });

  /**
   * The cookie checks here only look for the cookie's presence: they are a convenience redirect, not the
   * security boundary. Every page and API re-verifies the signed session. This test documents that.
   */
  it("treats any non-empty cookie as 'logged in' (real verification happens in the pages and APIs)", () => {
    expect(run("/my-courses", { lms_user_id: "anything" }).passes).toBe(true);
  });
});
