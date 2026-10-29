import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_RULES } from "@/lib/rateLimit";
import { decryptSecret, generateBackupCodes, verifyTotp } from "@/lib/totp";

/** Step 2: the user types the code their app shows; if it matches, two-step sign-in is switched on. */
export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const limit = await checkRateLimit(`2fa:${currentUser.id}`, RATE_LIMIT_RULES.TWO_FACTOR);
    if (!limit.success) return rateLimitResponse(limit, "Too many attempts. Please wait a few minutes.");

    const { code } = await req.json();
    const record = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { totpSecret: true, totpEnabled: true },
    });
    if (record?.totpEnabled) {
      return NextResponse.json({ error: "Two-step sign-in is already on for this account." }, { status: 400 });
    }
    if (!record?.totpSecret) {
      return NextResponse.json({ error: "Start the setup first." }, { status: 400 });
    }

    const step = verifyTotp(decryptSecret(record.totpSecret), code, null);
    if (step === null) {
      return NextResponse.json({ error: "That code is not correct. Check the code in your app and try again." }, { status: 400 });
    }

    const backup = generateBackupCodes();
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { totpEnabled: true, totpLastStep: step, totpBackupCodes: JSON.stringify(backup.hashes) },
    });

    // The plain backup codes are shown this once and never stored
    return NextResponse.json({ success: true, backupCodes: backup.plain });
  } catch (error: any) {
    console.error("[2FA ENABLE ERROR]", error);
    return NextResponse.json({ error: "Could not turn on two-step sign-in." }, { status: 500 });
  }
}
