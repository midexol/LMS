/**
 * The page's Content-Security-Policy, built per request.
 *
 * Scripts may only run if they carry this request's one-time `nonce` (or come from the listed hosts), so a
 * script injected into a page by an attacker is blocked by the browser instead of running. Inline scripts
 * and `eval` are not allowed in production. (Styles still allow inline `style` attributes, which React uses.)
 */
export function buildContentSecurityPolicy(nonce: string, isDev = false): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    // only the dev server's hot reload needs eval
    ...(isDev ? ["'unsafe-eval'"] : []),
    "https://js.paystack.co",
    "https://accounts.google.com/gsi/client",
  ];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.paystack.co https://checkout.paystack.com https://generativelanguage.googleapis.com https://api.openai.com https://api.pwnedpasswords.com https://accounts.google.com/gsi/ https://*.supabase.co",
    "frame-src 'self' https://checkout.paystack.com https://www.youtube.com https://www.youtube-nocookie.com https://accounts.google.com/gsi/",
    "media-src 'self' blob: https://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** A fresh, unguessable value for each request (works in the edge runtime). */
export function makeNonce(): string {
  return btoa(crypto.randomUUID());
}
