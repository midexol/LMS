/**
 * Global test setup. Every test file gets:
 *  - a fake Prisma client (the real one is never created, so no test can touch the database),
 *  - fake next/headers cookies, a fake mail module, and a stubbed getCurrentUser,
 *  - clean, fake environment variables with no real keys.
 */
import { vi, beforeEach, afterEach } from "vitest";
import { prismaMock, resetPrismaMock, mailMock, resetMailMock, cookieJar, MAIL_FUNCTIONS } from "./helpers/mocks";

// Deliberately unusable values: a test that tried to open a real connection would fail loudly.
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test_never_connect";
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.SESSION_SECRET = "test_session_secret_for_vitest_only";
// the breach check calls an outside service; tests turn it off and test it separately with a fake
process.env.DISABLE_PWNED_CHECK = "true";
process.env.NEXT_PUBLIC_APP_URL = "https://lms.test";

// Never let real keys from a developer's shell leak into tests.
for (const key of [
  "GEMINI_API_KEY", "OPENAI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY", "GROQ_MODEL", "OPENROUTER_MODEL", "AI_PROVIDER", "GEMINI_MODEL", "OPENAI_MODEL",
  "PAYSTACK_SECRET_KEY", "PAYSTACK_PUBLIC_KEY", "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
  "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM",
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPPORT_EMAIL", "NEXT_PUBLIC_INSTITUTION_NAME", "VERCEL",
]) {
  delete process.env[key];
}

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Production hashes passwords at cost 12 (about 250 ms each). Tests only need correct behaviour, so use cost 4.
// compare() reads the cost from the hash itself, so hashes from either setting verify the same way.
vi.mock("bcryptjs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("bcryptjs")>();
  const real = (actual as any).default ?? actual;
  const hash = (password: string, _rounds?: number | string) => real.hash(password, 4);
  return { ...actual, default: { ...real, hash }, hash };
});

vi.mock("next/headers", () => ({
  cookies: async () => cookieJar,
}));

vi.mock("@/lib/mail", () => {
  const exports: Record<string, unknown> = {};
  for (const name of MAIL_FUNCTIONS) exports[name] = mailMock[name];
  return exports;
});

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

beforeEach(() => {
  resetPrismaMock();
  resetMailMock();
  cookieJar.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
