"use client";

import React, { useEffect, useState } from "react";
import { BREACHED_MESSAGE, MIN_PASSWORD_LENGTH, passwordRules, type PasswordContext } from "@/lib/passwordPolicy";
import { pwnedCount } from "@/lib/pwned";

/**
 * Live feedback for a new password: which rules it meets, and whether it has appeared in a known data
 * breach (checked a moment after typing stops; only a 5-character fingerprint prefix leaves the device).
 * This is guidance only. The server applies the same rules again and has the final say.
 */
export function usePasswordCheck(password: string, ctx: PasswordContext = {}) {
  const rules = passwordRules(password, ctx);
  const rulesOk = password.length > 0 && rules.every((r) => r.ok);
  const [lookup, setLookup] = useState<{ password: string; count: number | null } | null>(null);

  useEffect(() => {
    if (!rulesOk) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const count = await pwnedCount(password);
      if (!cancelled) setLookup({ password, count });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [password, rulesOk]);

  const answered = lookup && lookup.password === password ? lookup : null;
  const checking = rulesOk && !answered;
  const breached = rulesOk && answered !== null && typeof answered.count === "number" && answered.count > 0;
  return { rules, rulesOk, checking, breached, ok: rulesOk && !breached };
}

export function PasswordRules({ password, check }: { password: string; check: ReturnType<typeof usePasswordCheck> }) {
  if (!password) {
    return (
      <p className="mt-2 text-xs text-neutral-500">
        Use at least {MIN_PASSWORD_LENGTH} characters. Three or four unrelated words make a strong, easy-to-remember password.
      </p>
    );
  }
  return (
    <ul className="mt-2 space-y-1 text-xs" aria-live="polite" aria-label="Password rules">
      {check.rules.map((r) => (
        <li key={r.id} className={r.ok ? "text-[#166534]" : "text-neutral-600"}>
          <span aria-hidden="true">{r.ok ? "✓" : "•"}</span> {r.label}
        </li>
      ))}
      {check.rulesOk && (
        <li className={check.breached ? "text-red-700 font-medium" : check.checking ? "text-neutral-500" : "text-[#166534]"}>
          {check.checking ? (
            <>Checking known data breaches...</>
          ) : check.breached ? (
            <>{BREACHED_MESSAGE}</>
          ) : (
            <>
              <span aria-hidden="true">✓</span> Not found in known data breaches
            </>
          )}
        </li>
      )}
    </ul>
  );
}
