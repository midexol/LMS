import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * These tests read the source code itself and enforce rules that must hold for EVERY route,
 * so a future route cannot quietly skip authentication or leak internals.
 */
const ROOT = path.resolve(__dirname, "../..");
const API_DIR = path.join(ROOT, "src/app/api");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

const routes = walk(API_DIR)
  .filter((f) => f.endsWith("route.ts"))
  .map((file) => ({
    name: path.relative(API_DIR, path.dirname(file)).replace(/\\/g, "/"),
    source: fs.readFileSync(file, "utf-8"),
  }));

/** Endpoints that are public on purpose, each with the reason and the protection it uses instead of a login. */
const PUBLIC_ROUTES: Record<string, { why: string; protection: RegExp }> = {
  "auth/login": { why: "signing in", protection: /checkRateLimit/ },
  "auth/register": { why: "creating a student account", protection: /checkRateLimit/ },
  "auth/logout": { why: "clearing cookies", protection: /cookieStore\.delete/ },
  "auth/forgot-password": { why: "requesting a reset email", protection: /checkRateLimit/ },
  "auth/reset-password": { why: "using an emailed token", protection: /checkRateLimit/ },
  "auth/verify-email": { why: "using an emailed token", protection: /checkRateLimit/ },
  "auth/verify-email/resend": { why: "requesting a new verification email", protection: /checkRateLimit/ },
  "auth/privy": { why: "social sign-in, proven by a Privy-verified token", protection: /verifyAuthToken/ },
  "contact": { why: "public contact form", protection: /checkRateLimit/ },
  "payment/verify": { why: "Paystack redirects the browser here; confirmation is done server-to-server", protection: /checkRateLimit/ },
  "payment/webhook": { why: "called by Paystack, authenticated by HMAC signature", protection: /verifyPaystackWebhookSignature/ },
};

describe("API route inventory", () => {
  it("finds the routes (guards against this test silently scanning nothing)", () => {
    expect(routes.length).toBeGreaterThanOrEqual(27);
  });

  it("every public route in the allowlist still exists", () => {
    const names = new Set(routes.map((r) => r.name));
    for (const name of Object.keys(PUBLIC_ROUTES)) expect(names.has(name), name).toBe(true);
  });
});

describe("authentication", () => {
  const protectedRoutes = routes.filter((r) => !(r.name in PUBLIC_ROUTES));

  it.each(protectedRoutes.map((r) => [r.name, r.source] as const))("%s requires a signed-in user", (_name, source) => {
    expect(source).toMatch(/getCurrentUser\(\)/);
    expect(source).toMatch(/status:\s*40[13]/);
  });

  it.each(Object.entries(PUBLIC_ROUTES))("public route %s is protected another way", (name, { protection }) => {
    const route = routes.find((r) => r.name === name)!;
    expect(route.source, `${name} must use its own protection`).toMatch(protection);
  });

  it("every admin route checks for an admin role", () => {
    for (const r of routes.filter((r) => r.name.startsWith("admin/"))) {
      expect(r.source, r.name).toMatch(/role !== "ADMIN" && currentUser\.role !== "SUPERADMIN"/);
    }
  });

  it("every instructor route allows SUPERADMIN wherever it allows ADMIN (no accidental lock-outs)", () => {
    for (const r of routes) {
      const mentionsAdmin = /role !== "ADMIN"/.test(r.source);
      if (mentionsAdmin) expect(r.source, r.name).toMatch(/SUPERADMIN/);
    }
  });
});

describe("error handling", () => {
  it("no route sends raw exception text to the client", () => {
    const offenders = routes
      .filter((r) => r.name !== "payment/verify") // intentionally returns payment reasons, covered by its own tests
      .filter((r) => /error:\s*(error|err|e)(\?)?\.message/.test(r.source))
      .map((r) => r.name);
    expect(offenders).toEqual([]);
  });

  it("no route reflects the request's Host header into links (reset, verify and payment URLs use NEXT_PUBLIC_APP_URL)", () => {
    const offenders = routes.filter((r) => /url\.host|headers\.get\(["']host["']\)|x-forwarded-host/i.test(r.source)).map((r) => r.name);
    expect(offenders).toEqual([]);
  });
});

describe("sensitive actions are rate limited", () => {
  const mustLimit = ["auth/login", "auth/register", "auth/forgot-password", "auth/reset-password", "auth/verify-email/resend", "contact", "grade", "tutor/assistant", "tutor/upload", "student/discussion", "student/profile", "payment/initialize", "payment/verify"];
  it.each(mustLimit)("%s calls checkRateLimit", (name) => {
    expect(routes.find((r) => r.name === name)!.source).toMatch(/checkRateLimit\(/);
  });

  it("every rate-limit check is awaited (an un-awaited promise is always 'truthy' and would never block)", () => {
    for (const r of routes) {
      const calls = r.source.match(/checkRateLimit\(/g) ?? [];
      const awaited = r.source.match(/await checkRateLimit\(/g) ?? [];
      const imports = (r.source.match(/import[^;]*checkRateLimit/g) ?? []).length;
      expect(calls.length - imports, r.name).toBeLessThanOrEqual(awaited.length);
    }
  });
});

describe("secrets and passwords", () => {
  it("no route returns a user object that could contain the password hash", () => {
    for (const r of routes) {
      if (/NextResponse\.json\(\{[^}]*user:\s*(user|newUser|updatedUser)\b/.test(r.source)) {
        expect(r.source, `${r.name} returns a user: it must strip the password`).toMatch(/password:\s*_pw|select:/);
      }
    }
  });

  it("passwords are only ever compared or stored through bcrypt", () => {
    for (const r of routes) {
      expect(r.source, r.name).not.toMatch(/password\s*===\s*/);
      expect(r.source, r.name).not.toMatch(/user\.password\s*==/);
    }
  });

  it("session cookies are always httpOnly", () => {
    for (const r of routes) {
      const sets = r.source.match(/cookieStore\.set\(\s*"(lms_user_id|lms_user_role)"[\s\S]*?\}\s*\)/g) ?? [];
      for (const s of sets) expect(s, r.name).toMatch(/httpOnly:\s*true/);
    }
  });
});

describe("code ↔ database schema contract", () => {
  const schema = fs.readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf-8");

  it("uses PostgreSQL with pooled and direct connection URLs from the environment", () => {
    expect(schema).toMatch(/provider\s*=\s*"postgresql"/);
    expect(schema).toMatch(/url\s*=\s*env\("DATABASE_URL"\)/);
    expect(schema).toMatch(/directUrl\s*=\s*env\("DIRECT_URL"\)/);
    expect(schema).not.toMatch(/file:\.\/dev\.db/);
  });

  it("defines every compound key the code looks records up by", () => {
    const sources = routes.map((r) => r.source).join("\n") + fs.readFileSync(path.join(ROOT, "src/lib/payment.ts"), "utf-8");
    const used = new Set(sources.match(/\b(student[A-Za-z]*_[a-z][A-Za-z]*)\b/g));
    expect(used.size).toBeGreaterThan(0);
    const model = (name: string) => schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))![0];
    if (used.has("studentId_courseId")) expect(model("Enrollment")).toMatch(/@@unique\(\[studentId, courseId\]\)/);
    if (used.has("studentId_lessonId")) expect(model("LessonProgress")).toMatch(/@@unique\(\[studentId, lessonId\]\)/);
  });

  it("enforces the invariants the app relies on", () => {
    const model = (name: string) => schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))![0];
    expect(model("User")).toMatch(/email\s+String\s+@unique/);
    expect(model("Payment")).toMatch(/reference\s+String\s+@unique/);
    expect(model("Enrollment")).toMatch(/@@unique\(\[studentId, courseId\]\)/);
    expect(model("User")).toMatch(/sessionsValidAfter/);
    expect(model("User")).toMatch(/lastLoginAt/);
    expect(model("ContactMessage")).toMatch(/status\s+String\s+@default\("NEW"\)/);
  });

  it("removing a user or course cleans up its dependent records", () => {
    for (const m of ["Enrollment", "Submission", "Payment", "LessonProgress"]) {
      const block = schema.match(new RegExp(`model ${m} \\{[\\s\\S]*?\\n\\}`))![0];
      expect(block, m).toMatch(/onDelete:\s*Cascade/);
    }
  });
});

describe("honest wording (no invented institution, accreditation or authority)", () => {
  const SRC_DIR = path.join(ROOT, "src");
  const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const toRelative = (file: string) => path.relative(ROOT, file).split(path.sep).join("/");
  const files = walk(SRC_DIR)
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .filter((f) => !/\/app\/(terms|privacy)\//.test(toRelative(f).replace(/^/, "/"))); // legal pages are reviewed separately
  const BANNED: Array<[string, RegExp]> = [
    ["'official'", /\bofficial\b/i],
    ["'institutional'", /\binstitutional\b/i],
    ["'university-grade'", /university-grade/i],
    ["'accredited'", /accredited/i],
    ["'bursary'", /\bbursary\b/i],
    ["'examination board'", /examination board/i],
    ["'directorate'", /directorate/i],
  ];

  it("scans real files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(BANNED)("no user-facing text says %s", (_label, pattern) => {
    const offenders = files.filter((f) => pattern.test(stripComments(fs.readFileSync(f, "utf-8")))).map(toRelative);
    expect(offenders).toEqual([]);
  });

  it("only the landing page footer may name 'The Federal Polytechnic' (and it is configurable)", () => {
    const offenders = files.filter((f) => /Federal Polytechnic/.test(stripComments(fs.readFileSync(f, "utf-8")))).map(toRelative);
    expect(offenders).toEqual(["src/app/LandingPage.tsx"]);
  });
});
