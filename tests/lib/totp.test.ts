import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { generateSecret, totpCode, verifyTotp, otpauthUri, encryptSecret, decryptSecret, generateBackupCodes, useBackupCode, currentStep } from "@/lib/totp";

beforeEach(() => vi.stubEnv("SESSION_SECRET", "test-session-secret-0123456789abcdef"));
afterEach(() => vi.unstubAllEnvs());

describe("one-time codes (RFC 6238)", () => {
  // The RFC's own test secret is the ASCII string "12345678901234567890", which is this base32 text
  const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  it("produces the RFC 6238 test vectors (SHA-1, 6 digits)", () => {
    expect(totpCode(RFC_SECRET, 59 * 1000)).toBe("287082");
    expect(totpCode(RFC_SECRET, 1111111109 * 1000)).toBe("081804");
    expect(totpCode(RFC_SECRET, 1234567890 * 1000)).toBe("005924");
    expect(totpCode(RFC_SECRET, 2000000000 * 1000)).toBe("279037");
  });

  it("accepts the current code and one step either side, and nothing further away", () => {
    const secret = generateSecret();
    const now = Date.UTC(2026, 9, 29, 12, 0, 10);
    expect(verifyTotp(secret, totpCode(secret, now), null, now)).toBe(currentStep(now));
    expect(verifyTotp(secret, totpCode(secret, now - 30_000), null, now)).toBe(currentStep(now) - 1);
    expect(verifyTotp(secret, totpCode(secret, now + 30_000), null, now)).toBe(currentStep(now) + 1);
    expect(verifyTotp(secret, totpCode(secret, now - 120_000), null, now)).toBeNull();
  });

  it("refuses to accept the same code twice", () => {
    const secret = generateSecret();
    const now = Date.now();
    const step = verifyTotp(secret, totpCode(secret, now), null, now)!;
    expect(step).not.toBeNull();
    expect(verifyTotp(secret, totpCode(secret, now), step, now)).toBeNull();
  });

  it("refuses anything that is not six digits", () => {
    const secret = generateSecret();
    for (const bad of ["", "12345", "1234567", "abcdef", undefined, null, 123456, "12 34 5x"]) {
      expect(verifyTotp(secret, bad, null)).toBeNull();
    }
  });

  it("gives each secret its own codes, and a 32-character secret", () => {
    const a = generateSecret(), b = generateSecret();
    expect(a).toMatch(/^[A-Z2-7]{32}$/);
    expect(a).not.toBe(b);
  });

  it("builds a link an authenticator app understands", () => {
    const uri = otpauthUri("ABC234", "ada@test.com");
    expect(uri).toBe("otpauth://totp/Academia:ada%40test.com?secret=ABC234&issuer=Academia&algorithm=SHA1&digits=6&period=30");
  });
});

describe("the secret at rest", () => {
  it("is encrypted, and decrypts back", () => {
    const secret = generateSecret();
    const stored = encryptSecret(secret);
    expect(stored).not.toContain(secret);
    expect(decryptSecret(stored)).toBe(secret);
    expect(encryptSecret(secret)).not.toBe(stored); // a fresh nonce every time
  });

  it("cannot be read, or tampered with, without the server's secret", () => {
    const stored = encryptSecret("SECRETSECRETSECRETSECRETSECRET12");
    const [iv, tag, enc] = stored.split(".");
    expect(() => decryptSecret([iv, tag, enc.slice(0, -2) + "AA"].join("."))).toThrow();
    vi.stubEnv("SESSION_SECRET", "a-different-secret-entirely-000000");
    expect(() => decryptSecret(stored)).toThrow();
  });

  it("uses its own key when one is set, so rotating the session secret does not lock anyone out", () => {
    vi.stubEnv("TOTP_ENCRYPTION_KEY", "a-separate-encryption-key-0123456789");
    const stored = encryptSecret("SECRETSECRETSECRETSECRETSECRET12");
    vi.stubEnv("SESSION_SECRET", "a-rotated-session-secret-0000000000");
    expect(decryptSecret(stored)).toBe("SECRETSECRETSECRETSECRETSECRET12");
    vi.stubEnv("TOTP_ENCRYPTION_KEY", "");
    expect(() => decryptSecret(stored)).toThrow(); // without its own key it falls back to the session secret, which differs
  });

  it("refuses to work with no server secret at all", () => {
    vi.stubEnv("SESSION_SECRET", "");
    expect(() => encryptSecret("X")).toThrow(/SESSION_SECRET/);
  });
});

describe("backup codes", () => {
  it("are eight readable, unique codes, stored only as hashes", () => {
    const { plain, hashes } = generateBackupCodes();
    expect(plain).toHaveLength(8);
    expect(new Set(plain).size).toBe(8);
    for (const p of plain) expect(p).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
    for (const h of hashes) expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(hashes)).not.toContain(plain[0].replace("-", ""));
  });

  it("work once, in any letter case or spacing, and are then gone", () => {
    const { plain, hashes } = generateBackupCodes();
    const stored = JSON.stringify(hashes);
    const left = useBackupCode(stored, plain[3].toLowerCase().replace("-", " "))!;
    expect(left).toHaveLength(7);
    expect(useBackupCode(JSON.stringify(left), plain[3])).toBeNull();
    expect(useBackupCode(JSON.stringify(left), plain[4])).toHaveLength(6);
  });

  it("refuse wrong, malformed and missing input", () => {
    const { hashes } = generateBackupCodes();
    const stored = JSON.stringify(hashes);
    for (const bad of ["AAAAA-AAAAA", "", "short", undefined, null, 5]) expect(useBackupCode(stored, bad)).toBeNull();
    expect(useBackupCode(null, "AAAAA-AAAAA")).toBeNull();
    expect(useBackupCode("not json", "AAAAA-AAAAA")).toBeNull();
  });
});
