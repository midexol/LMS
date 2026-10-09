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
  phone?: string | null;
  emailVerified: boolean;
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

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

/**
 * Signs a session token of the form `userId.issuedAtMs.signature`. The issue time is signed too,
 * so tokens expire on their own and can be revoked by moving the user's sessionsValidAfter forward.
 */
export function signSessionToken(userId: string): string {
  const issuedAt = Date.now();
  return `${userId}.${issuedAt}.${signPayload(`${userId}.${issuedAt}`)}`;
}

export interface VerifiedSession {
  userId: string;
  issuedAt: number;
}

/**
 * Validates a signed session token. Returns null if forged, malformed, or expired.
 */
export function verifySessionToken(token: string): VerifiedSession | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, issuedAtRaw, signature] = parts;
  const issuedAt = Number(issuedAtRaw);
  if (!userId || !signature || !Number.isFinite(issuedAt)) return null;

  const ageMs = Date.now() - issuedAt;
  if (ageMs < 0 || ageMs > SESSION_MAX_AGE_SECONDS * 1000) return null;

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(signPayload(`${userId}.${issuedAtRaw}`), "hex");
    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { userId, issuedAt };
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

    const session = verifySessionToken(rawToken);
    if (!session) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) return null;

    // Sessions issued before a password change/reset are revoked
    if (user.sessionsValidAfter && session.issuedAt < user.sessionsValidAfter.getTime()) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "STUDENT" | "TUTOR" | "ADMIN" | "SUPERADMIN",
      faculty: user.faculty,
      department: user.department,
      phone: user.phone,
      emailVerified: user.emailVerified,
    };
  } catch (error) {
    console.error("[AUTH ERROR]", error);
    return null;
  }
}
