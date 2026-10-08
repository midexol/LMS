import { redirect } from "next/navigation";

export default function InstructorSettingsPage() {
  redirect("/instructor?tab=settings");
}
