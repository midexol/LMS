export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const yyyy = d.getFullYear();
  const mmm = months[d.getMonth()];
  const dd = String(d.getDate()).padStart(2, "0");

  return `${mmm} ${dd}, ${yyyy}`;
}

export function formatNgn(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "₦0";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Canonical public base URL for links sent to users (emails, payment callbacks).
 * Never derive this from request headers: a forged Host header would point
 * reset/verification links at an attacker's domain.
 */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL must be set in production.");
  }
  return "http://localhost:3000";
}

/**
 * Validates an optional phone number. Accepts spaces, dashes and brackets, an optional leading +,
 * and 7-15 digits (covers Nigerian local numbers like 0803 123 4567 and international numbers).
 * Returns the cleaned number, `null` when empty, or `undefined` when invalid.
 */
export function normalizePhone(input: unknown): string | null | undefined {
  if (input === null || input === undefined) return null;
  if (typeof input !== "string") return undefined;
  const cleaned = input.replace(/[\s\-()]/g, "");
  if (cleaned === "") return null;
  return /^\+?[0-9]{7,15}$/.test(cleaned) ? cleaned : undefined;
}
