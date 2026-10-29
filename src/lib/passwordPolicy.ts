/**
 * Password rules, shared by the screens (live feedback) and the server (the real enforcement).
 * No Node-only imports, so it runs in the browser too.
 */
export const MIN_PASSWORD_LENGTH = 10;
/** bcrypt only reads the first 72 bytes, so anything longer would be silently cut short. */
export const MAX_PASSWORD_BYTES = 72;

/** The most-used passwords. A password that is one of these, or one of these plus digits or symbols, is refused. */
const COMMON = new Set(
  (
    "password passw0rd p4ssword pass word1 welcome welcome1 admin administrator login letmein qwerty qwertyuiop " +
    "qwerty123 asdfgh asdfghjkl zxcvbn zxcvbnm abc123 abcdef abcdefg iloveyou monkey dragon master sunshine princess " +
    "football baseball soccer batman superman trustno1 shadow michael jennifer jordan hunter ranger harley buster " +
    "thomas robert daniel andrew joshua matthew hannah jessica ashley nicole charlie freedom whatever starwars " +
    "computer internet changeme default secret test testing guest user student teacher school academia nigeria " +
    "lagos abuja ekiti polytechnic federal naija godisgood blessing jesus christ allahu mummy daddy pass1234 " +
    "access flower hello hottie lovely loveyou mustang pepper cookie summer winter spring autumn ginger hockey " +
    "killer biteme tigger cheese yankees cowboys 111111 000000 123123 123321 654321 666666 121212 112233 987654321 " +
    "1q2w3e4r 1qaz2wsx qazwsx zaq12wsx q1w2e3r4 qwe123 asd123 asdasd iloveyou1 sunshine1 princess1 football1"
  ).split(" ")
);

const SEQUENCES = ["01234567890", "0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiopasdfghjklzxcvbnm", "9876543210", "zyxwvutsrqponmlkjihgfedcba"];

const byteLength = (s: string) => new TextEncoder().encode(s).length;

/** Lower-cases and strips digits and symbols from the ends, so "Password123!" is seen as "password". */
const core = (s: string) => s.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "");

function isSimplePattern(lower: string): boolean {
  if (/^(.)\1+$/.test(lower)) return true; // aaaaaaaaaa
  if (/^(.{1,3})\1+$/.test(lower)) return true; // abcabcabcabc
  const backwards = [...lower].reverse().join("");
  return SEQUENCES.some((seq) => seq.includes(lower) || seq.includes(backwards)); // 1234567890, abcdefghij
}

export interface PasswordContext {
  email?: string;
  name?: string;
}

/** Each rule as its own line, so a screen can show which ones are met. */
export function passwordRules(password: string, ctx: PasswordContext = {}): { id: string; label: string; ok: boolean }[] {
  const lower = password.toLowerCase();
  const local = (ctx.email || "").split("@")[0].toLowerCase();
  const nameParts = (ctx.name || "").toLowerCase().split(/\s+/).filter((p) => p.length >= 4);
  const containsPersonal =
    (local.length >= 4 && lower.includes(local)) || nameParts.some((part) => lower.includes(part));

  return [
    { id: "length", label: `At least ${MIN_PASSWORD_LENGTH} characters`, ok: password.length >= MIN_PASSWORD_LENGTH },
    { id: "max", label: `No more than ${MAX_PASSWORD_BYTES} characters`, ok: byteLength(password) <= MAX_PASSWORD_BYTES },
    { id: "common", label: "Not a common password", ok: password.length === 0 || !(COMMON.has(lower) || COMMON.has(core(password))) },
    { id: "pattern", label: "Not a simple pattern like 1234567890 or aaaaaaaaaa", ok: password.length === 0 || !isSimplePattern(lower) },
    { id: "personal", label: "Does not contain your name or email", ok: !containsPersonal },
  ];
}

/** The first problem with a password, as a sentence for an error message, or null when it passes the rules. */
export function firstPasswordProblem(password: unknown, ctx: PasswordContext = {}): string | null {
  if (typeof password !== "string" || password.length === 0) return "Password is required.";
  const failed = passwordRules(password, ctx).find((r) => !r.ok);
  if (!failed) return null;
  switch (failed.id) {
    case "length": return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
    case "max": return `Password must be no more than ${MAX_PASSWORD_BYTES} characters long.`;
    case "common": return "That password is too common. Choose something harder to guess.";
    case "pattern": return "That password is a simple pattern. Choose something harder to guess.";
    default: return "Your password must not contain your name or email address.";
  }
}

export const BREACHED_MESSAGE =
  "That password has appeared in a known data breach, so it is not safe to use. Choose a different one.";
