import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { PrivyClient } from "@privy-io/server-auth";
import { signSessionToken } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const PRIVY_AUTH_RATE_LIMIT = { limit: 10, windowMs: 60 * 1000 };

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Privy is not configured: NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET are required.");
  }
  privyClient ??= new PrivyClient(appId, appSecret);
  return privyClient;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(`privy_auth:${ip}`, PRIVY_AUTH_RATE_LIMIT);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    const authHeader = req.headers.get("authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!accessToken) {
      return NextResponse.json({ error: "Missing Privy access token." }, { status: 401 });
    }

    // SECURITY: Identity comes only from a Privy-verified token, never from the request body
    const privy = getPrivyClient();
    let privyUser;
    try {
      const claims = await privy.verifyAuthToken(accessToken);
      privyUser = await privy.getUser(claims.userId);
    } catch (err) {
      console.warn("[PRIVY AUTH] Access token verification failed.", err);
      return NextResponse.json({ error: "Invalid or expired Privy session." }, { status: 401 });
    }

    const email = privyUser.email?.address || privyUser.google?.email || privyUser.apple?.email || null;
    const walletAddress = privyUser.wallet?.address || null;
    const name = privyUser.google?.name || null;

    // Privy can authenticate with email or wallet address
    const normalizedEmail = email ? email.toLowerCase().trim() : null;
    const finalIdentifier = normalizedEmail || (walletAddress ? `${walletAddress.toLowerCase()}@wallet.privy` : null);

    if (!finalIdentifier) {
      return NextResponse.json(
        { error: "A valid email address or wallet account is required to authenticate." },
        { status: 400 }
      );
    }

    const displayName =
      (name && name.trim()) ||
      (normalizedEmail ? normalizedEmail.split("@")[0] : `Student ${walletAddress!.slice(0, 6)}`);

    // Find existing user or create a new student account
    let user = await prisma.user.findUnique({
      where: { email: finalIdentifier },
    });

    if (!user) {
      // Generate a secure random password for DB integrity (Privy handles auth passwordlessly)
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      user = await prisma.user.create({
        data: {
          name: displayName,
          email: finalIdentifier,
          password: hashedPassword,
          role: "STUDENT",
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    }

    // Set signed LMS session cookie
    const cookieStore = await cookies();
    cookieStore.set("lms_user_id", signSessionToken(user.id), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    cookieStore.set("lms_user_role", user.role, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    const { password: _pw, ...safeUser } = user;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    console.error("[PRIVY AUTH API ERROR]", error);
    return NextResponse.json(
      { error: "Failed to authenticate with Privy." },
      { status: 500 }
    );
  }
}
