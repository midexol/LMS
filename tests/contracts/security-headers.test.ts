import { describe, it, expect, beforeAll } from "vitest";
import { buildContentSecurityPolicy } from "@/lib/csp";

let headers: Record<string, string> = {};
let csp: Record<string, string[]> = {};

beforeAll(async () => {
  const config = (await import("../../next.config.mjs")).default;
  const rules = await config.headers();
  expect(rules[0].source).toBe("/:path*"); // applies to every page and API route
  headers = Object.fromEntries(rules[0].headers.map((h: any) => [h.key, h.value]));
  expect(headers["Content-Security-Policy"]).toBeUndefined(); // built per request in the middleware, with a fresh nonce
  for (const part of buildContentSecurityPolicy("TESTNONCE", false).split(";")) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) csp[name] = values;
  }
});

describe("HTTP security headers", () => {
  it("does not announce the framework (no X-Powered-By header)", async () => {
    const config = (await import("../../next.config.mjs")).default;
    expect(config.poweredByHeader).toBe(false);
    expect(headers["X-Powered-By"]).toBeUndefined();
    expect(headers["Server"]).toBeUndefined();
  });

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

  it("only runs scripts that carry this request's nonce: no inline scripts and no eval in production", () => {
    expect(csp["script-src"]).toContain("'nonce-TESTNONCE'");
    expect(csp["script-src"]).not.toContain("'unsafe-inline'");
    expect(csp["script-src"]).not.toContain("'unsafe-eval'");
    expect(csp["script-src"]).not.toContain("'strict-dynamic'");
  });

  it("allows eval only on the development server (hot reload), never in production", () => {
    expect(buildContentSecurityPolicy("N", true)).toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy("N", false)).not.toContain("'unsafe-eval'");
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

  it("allows Google's sign-in button (script, frames, styles and its API)", () => {
    expect(csp["script-src"]).toContain("https://accounts.google.com/gsi/client");
    expect(csp["frame-src"]).toContain("https://accounts.google.com/gsi/");
    expect(csp["connect-src"]).toContain("https://accounts.google.com/gsi/");
    expect(csp["style-src"]).toContain("https://accounts.google.com/gsi/style");
  });

  it("no longer lists Privy or WalletConnect hosts", () => {
    const all = Object.values(csp).flat().join(" ");
    expect(all).not.toMatch(/privy|walletconnect|walletlink/i);
  });

  it("allows Cloudflare R2 for direct uploads and lesson video playback", () => {
    expect(csp["connect-src"]).toContain("https://*.r2.cloudflarestorage.com");
    expect(csp["media-src"]).toContain("https://*.r2.cloudflarestorage.com");
  });

  it("no longer allows Supabase", () => {
    expect(Object.values(csp).flat().join(" ")).not.toMatch(/supabase/i);
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
