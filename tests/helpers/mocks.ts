import { vi } from "vitest";

/* ───────────────────────── Prisma: an in-memory stand-in that can never reach a real database ───────────────────────── */

type MockFn = ReturnType<typeof vi.fn>;
const fns = new Map<string, MockFn>();
const models = new Map<string, unknown>();

function getFn(path: string): MockFn {
  let fn = fns.get(path);
  if (!fn) {
    fn = vi.fn();
    fns.set(path, fn);
  }
  return fn;
}

function applyDefaults() {
  // $transaction accepts either an array of operations or a callback receiving a transaction client
  getFn("$transaction").mockImplementation(async (arg: unknown) => {
    if (typeof arg === "function") return (arg as (tx: unknown) => unknown)(prismaMock);
    return Promise.all(arg as unknown[]);
  });
}

/**
 * `prismaMock.user.findUnique` (and every other model/method) is a vi.fn() created on first access.
 * Tests set return values explicitly; anything unset returns undefined.
 */
export const prismaMock: any = new Proxy(
  {},
  {
    get(_target, prop: string) {
      if (prop === "then") return undefined; // keep it from looking like a promise
      if (prop === "$transaction" || prop === "$disconnect" || prop === "$connect") return getFn(prop);
      if (!models.has(prop)) {
        models.set(
          prop,
          new Proxy({}, { get: (_t, method: string) => getFn(`${prop}.${method}`) })
        );
      }
      return models.get(prop);
    },
  }
);

export function resetPrismaMock() {
  fns.forEach((fn) => fn.mockReset());
  applyDefaults();
}
applyDefaults();

/* ───────────────────────── Mail ───────────────────────── */

export const MAIL_FUNCTIONS = [
  "sendEmailNotification",
  "sendEnrollmentEmail",
  "sendGradeEmail",
  "sendGradeOverrideEmail",
  "sendAnnouncementEmail",
  "sendCourseUpdateEmail",
  "sendCompletionEmail",
  "sendPasswordResetEmail",
  "sendVerificationEmail",
  "sendWelcomeEmail",
  "sendInstructorInviteEmail",
] as const;

export const mailMock: Record<(typeof MAIL_FUNCTIONS)[number], MockFn> = Object.fromEntries(
  MAIL_FUNCTIONS.map((name) => [name, vi.fn()])
) as any;

export function resetMailMock() {
  for (const fn of Object.values(mailMock)) {
    fn.mockReset();
    fn.mockResolvedValue(true);
  }
}
resetMailMock();

/* ───────────────────────── Cookies (next/headers) ───────────────────────── */

export interface StoredCookie {
  value: string;
  options?: Record<string, unknown>;
}

class CookieJar {
  private store = new Map<string, StoredCookie>();
  get(name: string) {
    const c = this.store.get(name);
    return c ? { name, value: c.value } : undefined;
  }
  set(name: string, value: string, options?: Record<string, unknown>) {
    this.store.set(name, { value, options });
  }
  delete(name: string) {
    this.store.delete(name);
  }
  /** Test helpers */
  options(name: string) {
    return this.store.get(name)?.options;
  }
  has(name: string) {
    return this.store.has(name);
  }
  clear() {
    this.store.clear();
  }
}

export const cookieJar = new CookieJar();
