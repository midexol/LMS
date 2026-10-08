import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete("lms_user_id");
  cookieStore.delete("lms_user_role");

  // If request is from standard browser navigation / form submission, redirect cleanly to /login
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  return NextResponse.json({ success: true, redirectUrl: "/login" });
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete("lms_user_id");
  cookieStore.delete("lms_user_role");
  return NextResponse.redirect(new URL("/login", req.url), 303);
}
