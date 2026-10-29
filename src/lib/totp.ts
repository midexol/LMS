import crypto from "crypto";

/**
 * Two-step sign-in with an authenticator app (RFC 6238 time-based codes), built on Node's crypto so
 * no extra package is needed. The shared secret is stored encrypted, a code can only be used once,
 * and backup codes are stored only as keyed hashes.
 */
const STEP_SECONDS = 30;
const DIGITS = 6;
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const BACKUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I, easier to read out

function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(text: string): Buffer {
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const ch of text.replace(/=+$/, "").toUpperCase()) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error("Invalid base32 character");
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}

export function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: string, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const off = h[h.length - 1] & 15;
  const bin = ((h[off] & 127) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function currentStep(now = Date.now()): number {
  return Math.floor(now / 1000 / STEP_SECONDS);
}

/** The code an authenticator app shows for `secret` at `now` (used by tests). */
export function totpCode(secret: string, now = Date.now()): string {
  return hotp(secret, currentStep(now));
}

/**
 * Checks a typed code. Returns the time step it matched (store it, and pass it back as `lastStep` so the
 * same code cannot be used twice), or null. One step either side tolerates a slow clock.
 */
export function verifyTotp(secret: string, code: unknown, lastStep: number | null | undefined, now = Date.now()): number | null {
  const typed = typeof code === "string" ? code.replace(/\s+/g, "") : "";
  if (!/^\d{6}$/.test(typed)) return null;
  const step = currentStep(now);
  for (const candidate of [step, step - 1, step + 1]) {
    if (lastStep != null && candidate <= lastStep) continue;
    const expected = Buffer.from(hotp(secret, candidate));
    if (crypto.timingSafeEqual(expected, Buffer.from(typed))) return candidate;
  }
  return null;
}

export function otpauthUri(secret: string, account: string, issuer = "Academia"): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/* ───────── secrets at rest ───────── */
function key(purpose: string): Buffer {
  // TOTP_ENCRYPTION_KEY lets the session secret be rotated without locking anyone out of two-step sign-in
  const base = process.env.TOTP_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!base) throw new Error("SESSION_SECRET (or TOTP_ENCRYPTION_KEY) must be set to use two-step sign-in.");
  return crypto.createHash("sha256").update(`${purpose}:${base}`).digest();
}

/** AES-256-GCM, returned as iv.tag.ciphertext (base64url). */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key("totp-secret"), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(stored: string): string {
  const [iv, tag, enc] = stored.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = crypto.createDecipheriv("aes-256-gcm", key("totp-secret"), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

/* ───────── backup codes ───────── */
const normalizeBackup = (code: string) => code.replace(/[\s-]/g, "").toUpperCase();
const hashBackup = (code: string) => crypto.createHmac("sha256", key("totp-backup")).update(normalizeBackup(code)).digest("hex");

/** Eight single-use codes. Show the plain ones once; store only the hashes. */
export function generateBackupCodes(count = 8): { plain: string[]; hashes: string[] } {
  const plain = Array.from({ length: count }, () => {
    const raw = Array.from(crypto.randomBytes(10), (b) => BACKUP_ALPHABET[b % BACKUP_ALPHABET.length]).join("");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { plain, hashes: plain.map(hashBackup) };
}

/** Whether `code` is one of the unused backup codes; returns the hash list with it removed, or null. */
export function useBackupCode(storedJson: string | null | undefined, code: unknown): string[] | null {
  if (typeof code !== "string" || normalizeBackup(code).length !== 10) return null;
  let hashes: string[];
  try { hashes = JSON.parse(storedJson || "[]"); } catch { return null; }
  const target = Buffer.from(hashBackup(code), "hex");
  const match = hashes.findIndex((h) => h.length === target.length * 2 && crypto.timingSafeEqual(Buffer.from(h, "hex"), target));
  if (match < 0) return null;
  return hashes.filter((_, i) => i !== match);
}
