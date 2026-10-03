import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CatalogClient } from "../CatalogClient";

export const revalidate = 0;

export default async function CoursesCatalogPage() {
  const currentUser = await getCurrentUser();

  const [courses, activeEnrollment] = await Promise.all([
    prisma.course.findMany({
      where: { published: true },
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
    />
  );
}
