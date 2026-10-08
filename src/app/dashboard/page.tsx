import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role === "ADMIN" || currentUser.role === "SUPERADMIN") {
    redirect("/admin");
  }

  if (currentUser.role === "TUTOR") {
    redirect("/instructor");
  }

  redirect("/my-courses");
}
