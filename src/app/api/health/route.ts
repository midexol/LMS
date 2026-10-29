import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * For uptime monitors: 200 when the app can reach its database, 503 when it cannot.
 * It returns nothing about the data, only whether the app is up.
 */
export async function GET(req: Request) {
  const limit = await checkRateLimit(`health:${getClientIp(req)}`, { limit: 30, windowMs: 60 * 1000 });
  if (!limit.success) return rateLimitResponse(limit, "Too many requests.");

  try {
    await prisma.user.findFirst({ select: { id: true } });
    return NextResponse.json({ ok: true }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[HEALTH CHECK FAILED]", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: NO_STORE });
  }
}
