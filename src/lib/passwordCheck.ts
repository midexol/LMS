import { BREACHED_MESSAGE, firstPasswordProblem, type PasswordContext } from "./passwordPolicy";
import { pwnedCount } from "./pwned";

/**
 * The one check every route runs before it accepts a new password: the rules first, then the data-breach
 * list. Returns a sentence to show the user, or null when the password is fine. If the breach service cannot
 * be reached the rules alone decide, so a service outage never stops anyone signing up.
 */
export async function checkNewPassword(password: unknown, ctx: PasswordContext = {}): Promise<string | null> {
  const rule = firstPasswordProblem(password, ctx);
  if (rule) return rule;
  const seen = await pwnedCount(password as string);
  return seen && seen > 0 ? BREACHED_MESSAGE : null;
}
