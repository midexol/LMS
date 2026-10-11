import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePathForRole } from "@/lib/roles";
import { OnboardingClient } from "./OnboardingClient";

export const revalidate = 0;

/**
 * Shown to students who signed up with Google (or any account missing them) so they choose their faculty and
 * department before enrolling. Everyone else is sent where they belong.
 */
export default async function OnboardingPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  if (currentUser.role !== "STUDENT") redirect(homePathForRole(currentUser.role));

  // Already done: nothing to ask
  if (currentUser.faculty && currentUser.department) redirect("/my-courses");

  return <OnboardingClient name={currentUser.name} email={currentUser.email} />;
}
