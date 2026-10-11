import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { startSession } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const GOOGLE_AUTH_RATE_LIMIT = { limit: 10, windowMs: 60 * 1000 };

let googleClient: OAuth2Client | null = null;

/**
 * "Sign in with Google": the browser sends the ID token Google gave it, and we verify the token's signature and
 * audience with Google's own library. The email and name come ONLY from that verified token, never from the
 * request body, so nobody can sign in as someone else by sending their email.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(`google_auth:${ip}`, GOOGLE_AUTH_RATE_LIMIT);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "Google sign-in is not set up yet." }, { status: 503 });
    }

    const { credential } = await req.json();
    if (typeof credential !== "string" || credential.length < 20) {
      return NextResponse.json({ error: "Missing Google credential." }, { status: 400 });
    }

    googleClient ??= new OAuth2Client(clientId);
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
      payload = ticket.getPayload();
    } catch (err) {
      console.warn("[GOOGLE AUTH] Token verification failed.", err);
      return NextResponse.json({ error: "Invalid or expired Google sign-in." }, { status: 401 });
    }

    if (!payload?.email || payload.email_verified !== true) {
      return NextResponse.json({ error: "Your Google account's email address is not verified." }, { status: 401 });
    }

    const email = payload.email.toLowerCase().trim();
    const displayName = (payload.name && payload.name.trim()) || email.split("@")[0];

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Unusable random password: this account signs in with Google (or resets a password later)
      const hashedPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
      user = await prisma.user.create({
        data: {
          name: displayName,
          email,
          password: hashedPassword,
          role: "STUDENT",
          emailVerified: true,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Google has confirmed they control this address, so an unverified email account becomes verified
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(user.emailVerified ? {} : { emailVerified: true, emailVerifiedAt: new Date() }),
        },
      });
    }

    await startSession(user);

    // Students must tell us their faculty and department before they can enroll
    const needsProfile = user.role === "STUDENT" && (!user.faculty || !user.department);

    const { password: _pw, ...safeUser } = user;
    return NextResponse.json({ success: true, user: safeUser, needsProfile });
  } catch (error) {
    console.error("[GOOGLE AUTH API ERROR]", error);
    return NextResponse.json({ error: "Failed to sign in with Google." }, { status: 500 });
  }
}
