/**
 * Has this password appeared in a known data breach? Uses the Have I Been Pwned range API, which is built
 * so the password is never sent: only the first 5 characters of its SHA-1 fingerprint leave this machine,
 * and the matching is done here. Works in the browser and on the server (Web Crypto + fetch).
 */
const RANGE_URL = "https://api.pwnedpasswords.com/range/";

async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/**
 * How many times the password appears in known breaches (0 = never seen), or null when the check could not
 * be done (service unreachable, slow, or switched off). A null never blocks anyone: the other rules still apply.
 */
export async function pwnedCount(password: string, fetchImpl: typeof fetch = fetch): Promise<number | null> {
  if (typeof process !== "undefined" && process.env?.DISABLE_PWNED_CHECK === "true") return null;
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const res = await fetchImpl(RANGE_URL + prefix, {
      headers: { "Add-Padding": "true" }, // pads the answer so its size reveals nothing
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    for (const line of (await res.text()).split("\n")) {
      const [candidate, count] = line.trim().split(":");
      if (candidate === suffix) return Number(count) || 0;
    }
    return 0;
  } catch {
    return null;
  }
}
