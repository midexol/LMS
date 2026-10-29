import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_RULES } from "@/lib/rateLimit";
import { encryptSecret, generateSecret, otpauthUri } from "@/lib/totp";

/** Step 1 of turning on two-step sign-in: make a secret for the signed-in user to add to their authenticator app. */
export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const limit = await checkRateLimit(`2fa-setup:${currentUser.id}`, RATE_LIMIT_RULES.TWO_FACTOR);
    if (!limit.success) return rateLimitResponse(limit, "Too many attempts. Please wait a few minutes.");

    const record = await prisma.user.findUnique({ where: { id: currentUser.id }, select: { totpEnabled: true } });
    if (record?.totpEnabled) {
      return NextResponse.json({ error: "Two-step sign-in is already on for this account." }, { status: 400 });
    }

    // Not active yet: it only counts once the user proves their app shows the right code (the enable step)
    const secret = generateSecret();
    await prisma.user.update({ where: { id: currentUser.id }, data: { totpSecret: encryptSecret(secret), totpEnabled: false } });

    return NextResponse.json({ success: true, secret, otpauthUrl: otpauthUri(secret, currentUser.email) });
  } catch (error: any) {
    console.error("[2FA SETUP ERROR]", error);
    return NextResponse.json({ error: "Could not start two-step setup." }, { status: 500 });
  }
}
