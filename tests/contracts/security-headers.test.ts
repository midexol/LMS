import { describe, it, expect, beforeAll } from "vitest";

let headers: Record<string, string> = {};
let csp: Record<string, string[]> = {};

beforeAll(async () => {
  const config = (await import("../../next.config.mjs")).default;
  const rules = await config.headers();
  expect(rules[0].source).toBe("/:path*"); // applies to every page and API route
  headers = Object.fromEntries(rules[0].headers.map((h: any) => [h.key, h.value]));
  for (const part of headers["Content-Security-Policy"].split(";")) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) csp[name] = values;
  }
});

describe("HTTP security headers", () => {
  it("blocks framing (clickjacking) in both the legacy and modern way", () => {
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(csp["frame-ancestors"]).toEqual(["'none'"]);
  });

  it("forces HTTPS for two years, including subdomains", () => {
    expect(headers["Strict-Transport-Security"]).toMatch(/max-age=63072000/);
    expect(headers["Strict-Transport-Security"]).toMatch(/includeSubDomains/);
  });

  it("stops MIME sniffing and limits referrer and device access", () => {
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toMatch(/camera=\(\)/);
    expect(headers["Permissions-Policy"]).toMatch(/microphone=\(\)/);
    expect(headers["Permissions-Policy"]).toMatch(/geolocation=\(\)/);
  });
});

describe("Content-Security-Policy", () => {
  it("denies everything by default, then allows only what the app uses", () => {
    expect(csp["default-src"]).toEqual(["'self'"]);
    expect(csp["object-src"]).toEqual(["'none'"]);
    expect(csp["base-uri"]).toEqual(["'self'"]);
    expect(csp["form-action"]).toEqual(["'self'"]);
  });

  it("never allows scripts from arbitrary origins", () => {
    for (const source of csp["script-src"]) {
      expect(source).not.toBe("*");
      expect(source).not.toBe("https:");
      expect(source).not.toBe("http:");
    }
  });

  it("allows Paystack checkout", () => {
    expect(csp["script-src"]).toContain("https://js.paystack.co");
    expect(csp["frame-src"]).toContain("https://checkout.paystack.com");
    expect(csp["connect-src"]).toContain("https://api.paystack.co");
  });

  it("allows what Privy sign-in needs (its API, its popup frames and its bot check)", () => {
    expect(csp["script-src"]).toContain("https://auth.privy.io");
    expect(csp["frame-src"]).toContain("https://auth.privy.io");
    expect(csp["connect-src"]).toContain("https://auth.privy.io");
    expect(csp["script-src"]).toContain("https://challenges.cloudflare.com");
    expect(csp["frame-src"]).toContain("https://challenges.cloudflare.com");
  });

  it("allows Supabase for direct uploads and lesson video playback", () => {
    expect(csp["connect-src"]).toContain("https://*.supabase.co");
    expect(csp["media-src"]).toContain("https://*.supabase.co");
  });

  it("allows YouTube embeds for lesson videos", () => {
    expect(csp["frame-src"]).toContain("https://www.youtube.com");
    expect(csp["frame-src"]).toContain("https://www.youtube-nocookie.com");
  });

  it("allows the AI providers only for server-initiated hosts listed explicitly", () => {
    expect(csp["connect-src"]).toContain("https://generativelanguage.googleapis.com");
    expect(csp["connect-src"]).not.toContain("*");
  });
});
