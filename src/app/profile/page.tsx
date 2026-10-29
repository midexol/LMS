import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "./ProfileClient";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function StudentProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }




  const security = await prisma.user.findUnique({ where: { id: currentUser.id }, select: { totpEnabled: true } });

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: currentUser.id },
    include: { course: true },
    orderBy: { enrolledAt: "desc" },
  });

  const submissions = await prisma.submission.findMany({
    where: { studentId: currentUser.id },
    include: { assignment: true },
    orderBy: { submittedAt: "desc" },
  });

  const payments = await prisma.payment.findMany({
    where: { studentId: currentUser.id },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ProfileClient
      currentUser={currentUser}
      enrollments={enrollments}
      submissions={submissions}
      payments={payments}
      twoFactorEnabled={Boolean(security?.totpEnabled)}
    />
  );
}
