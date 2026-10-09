import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMIT_RULES } from "@/lib/rateLimit";

const TOPICS = [
  "Technical & Course Support",
  "Enrollment & Account Access",
  "Faculty & Instruction Inquiry",
  "General Question",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(`contact:${ip}`, RATE_LIMIT_RULES.CONTACT);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit, "You have sent several messages recently. Please try again later.");
    }

    const body = await req.json();

    // Honeypot: real visitors never see or fill this field. Pretend success so bots learn nothing.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ success: true });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const subject = TOPICS.includes(body.subject) ? body.subject : "General Question";

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }
    if (!EMAIL_PATTERN.test(email) || email.length > 200) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (message.length < 10 || message.length > 2000) {
      return NextResponse.json(
        { error: "Your message must be between 10 and 2000 characters." },
        { status: 400 }
      );
    }

    await prisma.contactMessage.create({ data: { name, email, subject, message } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONTACT API ERROR]", error);
    return NextResponse.json({ error: "Failed to send your message." }, { status: 500 });
  }
}
