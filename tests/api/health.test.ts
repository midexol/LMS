import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mocks";
import { call } from "../helpers/http";
import { GET as health } from "@/app/api/health/route";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  prismaMock.user.findFirst.mockResolvedValue({ id: "u1" });
});

const check = (ip?: string) => call(health, "/api/health", { method: "GET", ip });

describe("GET /api/health (for uptime monitors)", () => {
  it("answers 200 when the database can be reached, and says nothing else", async () => {
    const { status, body } = await check();
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  it("answers 503 when the database cannot be reached, without leaking the error", async () => {
    prismaMock.user.findFirst.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:5432 password=hunter2"));
    const { status, body } = await check();
    expect(status).toBe(503);
    expect(body).toEqual({ ok: false });
    expect(JSON.stringify(body)).not.toMatch(/ECONNREFUSED|hunter2|10\.0/);
  });

  it("needs no sign-in, and is never cached", async () => {
    const { res } = await check();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("is rate limited, so it cannot be used to hammer the database", async () => {
    const ip = "198.51.100.23";
    const statuses: number[] = [];
    for (let i = 0; i < 32; i++) statuses.push((await check(ip)).status);
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(30)).toEqual([429, 429]);
  });
});
