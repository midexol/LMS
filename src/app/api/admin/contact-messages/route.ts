import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN")) {
    return null;
  }
  return currentUser;
}

export async function PATCH(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Access denied: Administrator privileges required." }, { status: 403 });
    }

    const { id, status } = await req.json();
    if (typeof id !== "string" || (status !== "NEW" && status !== "READ")) {
      return NextResponse.json({ error: "A message id and a valid status are required." }, { status: 400 });
    }

    const updated = await prisma.contactMessage.update({ where: { id }, data: { status } });
    return NextResponse.json({ success: true, message: updated });
  } catch (error) {
    console.error("[ADMIN CONTACT PATCH ERROR]", error);
    return NextResponse.json({ error: "Failed to update message." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Access denied: Administrator privileges required." }, { status: 403 });
    }

    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Message id is required." }, { status: 400 });
    }

    await prisma.contactMessage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN CONTACT DELETE ERROR]", error);
    return NextResponse.json({ error: "Failed to delete message." }, { status: 500 });
  }
}
