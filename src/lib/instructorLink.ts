import crypto from "crypto";

/** Secrets shorter than this are refused, so a weak value cannot switch the sign-up link on. */
const MIN_KEY_LENGTH = 16;

/**
 * Whether `candidate` is the private key that lets someone create an instructor account.
 * The key lives in INSTRUCTOR_SIGNUP_KEY; when it is unset or too short the link is off for everyone.
 * Both sides are hashed first so the comparison takes the same time whatever the input.
 */
export function isValidInstructorKey(candidate: unknown): boolean {
  const secret = process.env.INSTRUCTOR_SIGNUP_KEY?.trim();
  if (!secret || secret.length < MIN_KEY_LENGTH || typeof candidate !== "string") return false;
  const a = crypto.createHash("sha256").update(candidate).digest();
  const b = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}
