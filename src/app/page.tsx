import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LandingPage } from "./LandingPage";
import { CatalogClient } from "./CatalogClient";

export const revalidate = 0;

interface PageProps {
  searchParams?: { view?: string };
}

export default async function HomePage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();

  // When a user signs in, nothing concerns them with the landing page again
  if (currentUser) {
    if (currentUser.role === "TUTOR") {
      redirect("/instructor");
    } else if (currentUser.role === "ADMIN" || currentUser.role === "SUPERADMIN") {
      redirect("/admin");
    } else {
      redirect("/my-courses");
    }
  }

  const view = searchParams?.view;

  // If user explicitly asks for catalog view (?view=catalog)
  if (view === "catalog") {
    const courses = await prisma.course.findMany({
      where: { published: true },
      include: {
        tutor: true,
        modules: { include: { lessons: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return <CatalogClient currentUser={currentUser} courses={courses} activeEnrollment={null} />;
  }

  // Landing page: real data only. Nothing here is estimated or filled in when there is no data.
  const [featuredCourses, categoryGroups] = await Promise.all([
    prisma.course.findMany({
      where: { published: true },
      take: 6,
      include: {
        tutor: { select: { name: true } },
        modules: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.groupBy({
      by: ["category"],
      where: { published: true },
      _count: { _all: true },
    }),
  ]);

  const categoryCounts = categoryGroups
    .map((g) => ({ category: g.category, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  return (
    <LandingPage
      currentUser={currentUser}
      featuredCourses={featuredCourses}
      categoryCounts={categoryCounts}
    />
  );
}
