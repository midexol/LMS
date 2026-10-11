import { vi } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { ACADEMIC_STRUCTURE } from "@/lib/academicStructure";

export type Role = "STUDENT" | "TUTOR" | "ADMIN" | "SUPERADMIN";

export interface TestUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  faculty: string | null;
  department: string | null;
  phone: string | null;
  emailVerified: boolean;
}

let userCounter = 0;

/** Every call gets a unique id, so per-user rate limits never leak from one test into another. */
export function makeUser(role: Role = "STUDENT", overrides: Partial<TestUser> = {}): TestUser {
  userCounter += 1;
  return {
    id: `${role.toLowerCase()}_${userCounter}`,
    name: `Test ${role}`,
    email: `${role.toLowerCase()}@test.com`,
    role,
    // A registered student has picked a faculty and department; staff accounts need not have
    faculty: role === "STUDENT" ? ACADEMIC_STRUCTURE[0].name : null,
    department: role === "STUDENT" ? ACADEMIC_STRUCTURE[0].departments[0] : null,
    phone: null,
    emailVerified: true,
    ...overrides,
  };
}

/** Make the next requests look like they come from a logged-in user (or from nobody when null). */
export function loginAs(role: Role | null, overrides: Partial<TestUser> = {}): TestUser | null {
  const user = role ? makeUser(role, overrides) : null;
  vi.mocked(getCurrentUser).mockResolvedValue(user as any);
  return user;
}

let ipCounter = 0;
/** A different client IP for every call, so the in-memory rate limiter never leaks between tests. */
export function freshIp(): string {
  ipCounter += 1;
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
}

interface ReqOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  ip?: string;
}

export function makeRequest(path: string, { method = "POST", body, headers = {}, ip }: ReqOptions = {}): Request {
  const init: RequestInit = {
    method,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip ?? freshIp(),
      ...headers,
    },
  };
  if (body !== undefined && method !== "GET" && method !== "HEAD") {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new Request(`http://localhost${path}`, init);
}

/** Calls a route handler and returns status plus parsed JSON body. */
export async function call(
  handler: (req: any) => Promise<Response>,
  path: string,
  options: ReqOptions = {}
): Promise<{ status: number; body: any; res: Response }> {
  const res = await handler(makeRequest(path, options));
  let body: any = null;
  try {
    body = await res.clone().json();
  } catch {
    body = null;
  }
  return { status: res.status, body, res };
}
