"use client";

import React from "react";
import { authInputClass, authLabelClass } from "./AuthShell";

/** The extra field the sign-in pages show once an account's password is right but it needs a code. */
export function TwoStepField({
  needsCode,
  code,
  setCode,
}: {
  needsCode: boolean;
  code: string;
  setCode: (value: string) => void;
}) {
  if (!needsCode) return null;
  return (
    <div>
      <label htmlFor="two-step-code" className={authLabelClass}>Authenticator code</label>
      <input
        id="two-step-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        required
        placeholder="6-digit code, or a backup code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className={authInputClass}
      />
      <p className="mt-1.5 text-xs text-neutral-500">Open your authenticator app and enter the current code.</p>
    </div>
  );
}
