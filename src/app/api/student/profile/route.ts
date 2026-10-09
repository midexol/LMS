import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, signSessionToken, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_RULES } from "@/lib/rateLimit";
import { cookies } from "next/headers";
import { normalizePhone } from "@/lib/utils";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`profile:${currentUser.id}`, RATE_LIMIT_RULES.PROFILE);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    const { name, password, currentPassword, faculty, department, phone } = await req.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    }

    const updateData: any = { name: name.trim() };

    if (phone !== undefined) {
      const cleanPhone = normalizePhone(phone);
      if (cleanPhone === undefined) {
        return NextResponse.json({ error: "Please enter a valid phone number, or leave it blank." }, { status: 400 });
      }
      updateData.phone = cleanPhone;
    }

    if (faculty !== undefined) {
      updateData.faculty = faculty ? faculty.trim() : null;
    }
    if (department !== undefined) {
      updateData.department = department ? department.trim() : null;
    }

    let passwordChanged = false;
    if (password && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      // SECURITY: changing a password requires proving knowledge of the current one,
      // so a hijacked or unattended session cannot take over the account.
      const existing = await prisma.user.findUnique({ where: { id: currentUser.id } });
      const currentOk =
        typeof currentPassword === "string" &&
        currentPassword.length > 0 &&
        existing !== null &&
        (await bcrypt.compare(currentPassword, existing.password));
      if (!currentOk) {
        return NextResponse.json(
          { error: "Your current password is incorrect. If you signed in with Google or a wallet, use \"Forgot password\" to set one." },
          { status: 403 }
        );
      }

      updateData.password = await bcrypt.hash(password.trim(), 12);
      // Revoke every session issued before now (other devices); this session is re-issued below
      updateData.sessionsValidAfter = new Date();
      passwordChanged = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData,
    });

    if (passwordChanged) {
      const cookieStore = await cookies();
      cookieStore.set("lms_user_id", signSessionToken(updatedUser.id), {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
    }

    const { password: _pw, ...safeUser } = updatedUser;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    console.error("[PROFILE UPDATE API ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
