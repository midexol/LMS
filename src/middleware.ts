import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userId = request.cookies.get("lms_user_id")?.value;

  // Allow API routes and static assets through
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".woff2")
  ) {
    return NextResponse.next();
  }

  const isAuthenticated = Boolean(userId);
  const userRole = request.cookies.get("lms_user_role")?.value;

  // Protected student-only routes (must be logged in)
  const studentPaths = ["/student", "/profile", "/my-courses"];
  if (studentPaths.some((p) => pathname.startsWith(p))) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protected instructor routes
  if (pathname.startsWith("/instructor") && pathname !== "/instructor/login") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/instructor/login", request.url));
    }
    if (userRole === "STUDENT") {
      return NextResponse.redirect(new URL("/my-courses", request.url));
    }
  }

  // Protected admin routes
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (userRole === "STUDENT") {
      return NextResponse.redirect(new URL("/my-courses", request.url));
    }
    if (userRole === "TUTOR") {
      return NextResponse.redirect(new URL("/instructor", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|logo.svg|assets).*)"],
};
