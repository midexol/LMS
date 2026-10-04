import { cookies } from "next/headers";
import { prisma } from "./prisma";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "TUTOR" | "ADMIN" | "SUPERADMIN";
  faculty?: string | null;
  department?: string | null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("lms_user_id")?.value;

    if (!userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "STUDENT" | "TUTOR" | "ADMIN" | "SUPERADMIN",
      faculty: user.faculty,
      department: user.department,
    };
  } catch (error) {
    console.error("[AUTH ERROR]", error);
    return null;
  }
}
