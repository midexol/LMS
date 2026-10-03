import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userId = request.cookies.get("lms_user_id")?.value;

  // Allow API routes and static assets through
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const isAuthenticated = Boolean(userId);

  // Protected student-only routes (must be logged in)
  const studentPaths = ["/student", "/profile", "/my-courses"];
  if (studentPaths.some((p) => pathname.startsWith(p))) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protected instructor routes (unauthenticated users must log in)
  if (pathname.startsWith("/instructor") && pathname !== "/instructor/login") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/instructor/login", request.url));
    }
  }

  // Protected admin routes (unauthenticated users must log in)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
