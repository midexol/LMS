import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CatalogClient } from "../CatalogClient";

export const revalidate = 0;

export default async function CoursesCatalogPage({
  searchParams,
}: {
  searchParams: { q?: string | string[] };
}) {
  const currentUser = await getCurrentUser();
  const rawQuery = searchParams.q;
  const initialSearch = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.slice(0, 100) ?? "";

  const whereClause: any = { published: true };
  if (currentUser?.role === "STUDENT" && currentUser.department) {
    whereClause.department = currentUser.department;
  }

  const [courses, activeEnrollment] = await Promise.all([
    prisma.course.findMany({
      where: whereClause,
      include: {
        tutor: true,
        modules: { include: { lessons: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    currentUser
      ? prisma.enrollment.findFirst({
          where: { studentId: currentUser.id, status: "ACTIVE" },
          include: { course: true },
        })
      : null,
  ]);

  return (
    <CatalogClient
      currentUser={currentUser}
      courses={courses}
      activeEnrollment={activeEnrollment}
      initialSearch={initialSearch}
    />
  );
}
