import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("lms_user_id");
  cookieStore.delete("lms_user_role");
  return NextResponse.json({ success: true });
}
