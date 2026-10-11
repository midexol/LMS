import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCheckout } from "@/lib/fees";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMIT_RULES } from "@/lib/rateLimit";

// Prices depend on live database and fee settings: never cache or prerender this route
export const dynamic = "force-dynamic";

/**
 * Price breakdown for a course checkout. Public on purpose: course prices are public, and the checkout
 * screen needs this before it can show the total. It never charges anything; the amount actually charged is
 * recalculated by the server when payment is started.
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(`payment_quote:${ip}`, RATE_LIMIT_RULES.QUOTE);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    const courseId = new URL(req.url).searchParams.get("courseId");
    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required." }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, price: true, published: true },
    });
    if (!course || !course.published) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, breakdown: calculateCheckout(course.price) });
  } catch (error) {
    console.error("[PAYMENT QUOTE ERROR]", error);
    return NextResponse.json({ error: "Could not calculate the price." }, { status: 500 });
  }
}
