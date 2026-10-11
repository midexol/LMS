/**
 * Where each kind of user lands after signing in. Kept free of server-only imports so both the sign-in
 * screens (browser) and the API routes can use it.
 */
export function homePathForRole(role: string | undefined | null): string {
  if (role === "ADMIN" || role === "SUPERADMIN") return "/admin";
  if (role === "TUTOR") return "/instructor";
  return "/my-courses";
}
