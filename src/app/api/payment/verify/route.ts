import { NextResponse } from "next/server";
import { verifyAndProcessPayment } from "@/lib/payment";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");
    const mode = url.searchParams.get("mode");

    if (!reference) {
      return NextResponse.json({ error: "Transaction reference is required." }, { status: 400 });
    }

    const result = await verifyAndProcessPayment(reference, mode === "simulated");

    return NextResponse.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      courseId: result.course.id,
      courseTitle: result.course.title,
    });
  } catch (error: any) {
    console.error("[PAYMENT VERIFY ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify payment." },
      { status: 400 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reference = body.reference || body.trxref;
    const isSimulated = Boolean(body.isSimulation);

    if (!reference) {
      return NextResponse.json({ error: "Transaction reference is required." }, { status: 400 });
    }

    const result = await verifyAndProcessPayment(reference, isSimulated);

    return NextResponse.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      courseId: result.course.id,
      courseTitle: result.course.title,
      enrollment: result.enrollment,
    });
  } catch (error: any) {
    console.error("[PAYMENT VERIFY POST ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify payment." },
      { status: 400 }
    );
  }
}
