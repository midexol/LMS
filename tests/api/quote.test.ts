import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mocks";
import { call } from "../helpers/http";
import { GET as quote } from "@/app/api/payment/quote/route";

const ask = (qs = "?courseId=course_1", ip?: string) => call(quote, `/api/payment/quote${qs}`, { method: "GET", ip });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  prismaMock.course.findUnique.mockResolvedValue({ id: "course_1", price: 20000, published: true });
});

describe("GET /api/payment/quote", () => {
  it("needs no login: course prices are public", async () => {
    const { status, body } = await ask();
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("with no fees configured returns just the course price", async () => {
    const { body } = await ask();
    expect(body.breakdown).toEqual({ coursePriceNgn: 20000, platformFeeNgn: 0, processingFeeNgn: 0, totalNgn: 20000, platformFeeLabel: "Platform service fee" });
  });

  it("returns the full breakdown once fees are switched on (N20,000 + N400, student covers Paystack)", async () => {
    vi.stubEnv("PLATFORM_FEE_NGN", "400");
    vi.stubEnv("PASS_PAYSTACK_FEE", "true");
    const { body } = await ask();
    expect(body.breakdown).toMatchObject({ coursePriceNgn: 20000, platformFeeNgn: 400, processingFeeNgn: 413, totalNgn: 20813 });
  });

  it("reads the price from the database, never from the request", async () => {
    await ask("?courseId=course_1&price=1&amount=1");
    expect(prismaMock.course.findUnique).toHaveBeenCalledWith({ where: { id: "course_1" }, select: { id: true, price: true, published: true } });
  });

  it("free courses have no fees", async () => {
    vi.stubEnv("PLATFORM_FEE_NGN", "400");
    prismaMock.course.findUnique.mockResolvedValue({ id: "c", price: 0, published: true });
    const { body } = await ask();
    expect(body.breakdown.totalNgn).toBe(0);
  });

  it("requires a course id and an existing, published course", async () => {
    expect((await ask("")).status).toBe(400);
    prismaMock.course.findUnique.mockResolvedValue(null);
    expect((await ask()).status).toBe(404);
    prismaMock.course.findUnique.mockResolvedValue({ id: "c", price: 100, published: false });
    expect((await ask()).status).toBe(404); // drafts are not discoverable
  });

  it("is rate limited (60 per 5 minutes per IP)", async () => {
    const ip = "203.0.113.150";
    const statuses = [];
    for (let i = 0; i < 61; i++) statuses.push((await ask("", ip)).status);
    expect(statuses[60]).toBe(429);
  });

  it("returns a generic error if the database fails", async () => {
    prismaMock.course.findUnique.mockRejectedValue(new Error("relation Course does not exist"));
    const { status, body } = await ask();
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("relation");
  });
});
