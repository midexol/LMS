import { cookies } from "next/headers";
import { prisma } from "./prisma";
import crypto from "crypto";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "TUTOR" | "ADMIN" | "SUPERADMIN";
  faculty?: string | null;
  department?: string | null;
}

const DEV_SESSION_SECRET = "dev_only_insecure_session_secret";

/**
 * Resolves the HMAC secret lazily so builds without runtime env vars still succeed.
 * Production refuses to run without a real secret, since a known secret lets anyone forge sessions.
 */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
  }
  return DEV_SESSION_SECRET;
}

/**
 * Signs a user ID with an HMAC-SHA256 signature to prevent cookie spoofing/tampering
 */
export function signSessionToken(userId: string): string {
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(userId)
    .digest("hex");
  return `${userId}.${signature}`;
}

/**
 * Validates a signed session token. Returns null if forged or invalid.
 */
export function verifySessionToken(token: string): string | null {
  if (!token) return null;

  // Only signed tokens (userId.signature) are accepted
  const [userId, signature, ...rest] = token.split(".");
  if (!userId || !signature || rest.length > 0) return null;

  const expectedSig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(userId)
    .digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      return userId;
    }
  } catch {
    return null;
  }
  return null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get("lms_user_id")?.value;

    if (!rawToken) {
      return null;
    }

    const verifiedUserId = verifySessionToken(rawToken);
    if (!verifiedUserId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: verifiedUserId },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "STUDENT" | "TUTOR" | "ADMIN" | "SUPERADMIN",
      faculty: user.faculty,
      department: user.department,
    };
  } catch (error) {
    console.error("[AUTH ERROR]", error);
    return null;
  }
}
