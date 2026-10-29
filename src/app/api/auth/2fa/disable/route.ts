import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_RULES } from "@/lib/rateLimit";
import { decryptSecret, useBackupCode, verifyTotp } from "@/lib/totp";

/** Turns two-step sign-in off. It needs both the password and a current code (or backup code). */
export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const limit = await checkRateLimit(`2fa:${currentUser.id}`, RATE_LIMIT_RULES.TWO_FACTOR);
    if (!limit.success) return rateLimitResponse(limit, "Too many attempts. Please wait a few minutes.");

    const { password, code } = await req.json();
    const record = await prisma.user.findUnique({ where: { id: currentUser.id } });
    if (!record?.totpEnabled || !record.totpSecret) {
      return NextResponse.json({ error: "Two-step sign-in is not on for this account." }, { status: 400 });
    }

    const passwordOk = await bcrypt.compare(String(password ?? ""), record.password);
    const codeOk =
      verifyTotp(decryptSecret(record.totpSecret), code, record.totpLastStep) !== null ||
      useBackupCode(record.totpBackupCodes, code) !== null;
    if (!passwordOk || !codeOk) {
      return NextResponse.json({ error: "Your password or code is not correct." }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { totpEnabled: false, totpSecret: null, totpLastStep: null, totpBackupCodes: null },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[2FA DISABLE ERROR]", error);
    return NextResponse.json({ error: "Could not turn off two-step sign-in." }, { status: 500 });
  }
}
