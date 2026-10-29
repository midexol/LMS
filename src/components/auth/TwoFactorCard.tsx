"use client";

import React, { useState } from "react";

type Phase = "idle" | "setup" | "backup" | "turnoff";

const inputClass =
  "w-full px-4 py-2.5 rounded-xl bg-[#F7F2F6] border border-rule text-sm text-black outline-none focus:border-[#4A1A45] transition-colors placeholder:text-neutral-400";
const labelClass = "block text-xs font-semibold text-neutral-700 mb-1.5";
const primaryButton =
  "px-5 py-2.5 rounded-md bg-[#4A1A45] hover:bg-[#3B1537] disabled:opacity-50 text-white font-semibold text-sm transition-colors";
const quietButton =
  "px-5 py-2.5 rounded-md border border-neutral-300 bg-white hover:bg-[#F3EAF2] text-black font-semibold text-sm transition-colors";

/** Group the setup key in fours so it is easier to type into an app. */
const grouped = (key: string) => key.replace(/(.{4})/g, "$1 ").trim();

async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

/** Turn two-step sign-in (an authenticator app) on or off for the signed-in account. */
export function TwoFactorCard({ enabled: initiallyEnabled }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [phase, setPhase] = useState<Phase>("idle");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const start = () =>
    run(async () => {
      const data = await post("/api/auth/2fa/setup");
      setSecret(data.secret);
      setUri(data.otpauthUrl);
      setCode("");
      setPhase("setup");
    });

  const confirm = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const data = await post("/api/auth/2fa/enable", { code });
      setBackupCodes(data.backupCodes);
      setEnabled(true);
      setCode("");
      setPhase("backup");
    });
  };

  const turnOff = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      await post("/api/auth/2fa/disable", { password, code });
      setEnabled(false);
      setPassword("");
      setCode("");
      setPhase("idle");
    });
  };

  return (
    <section className="p-6 sm:p-8 rounded-lg bg-white border border-rule space-y-4 max-w-2xl" aria-labelledby="two-step-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3">
        <h2 id="two-step-title" className="font-bold text-xl text-black">Two-step sign-in</h2>
        <span
          className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
            enabled ? "bg-[#4A1A45] text-white" : "bg-[#F3EAF2] text-neutral-700"
          }`}
        >
          {enabled ? "On" : "Off"}
        </span>
      </div>

      {error && (
        <p role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {phase === "idle" && !enabled && (
        <>
          <p className="text-sm text-neutral-600">
            Add a second step to sign-in: a 6-digit code from an authenticator app on your phone. Then a stolen password is
            not enough to get into this account.
          </p>
          <button type="button" onClick={start} disabled={loading} className={primaryButton}>
            {loading ? "Starting..." : "Turn on"}
          </button>
        </>
      )}

      {phase === "setup" && (
        <form onSubmit={confirm} className="space-y-4">
          <ol className="list-decimal pl-5 space-y-2 text-sm text-neutral-700">
            <li>Open an authenticator app (Google Authenticator, Microsoft Authenticator or Authy).</li>
            <li>
              Add an account and choose &quot;Enter a setup key&quot;, then type this key:
              <span className="mt-2 block rounded-md bg-[#F7F2F6] border border-rule px-3 py-2 font-mono text-sm tracking-wider break-all select-all text-black">
                {grouped(secret)}
              </span>
              <a href={uri} className="mt-1 inline-block text-xs font-semibold text-[#4A1A45] underline underline-offset-4">
                On a phone? Open it in your app
              </a>
            </li>
            <li>Type the 6-digit code the app now shows.</li>
          </ol>
          <div>
            <label htmlFor="two-step-code" className={labelClass}>6-digit code</label>
            <input
              id="two-step-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputClass}
              placeholder="123456"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={loading || code.replace(/\s/g, "").length < 6} className={primaryButton}>
              {loading ? "Checking..." : "Confirm and turn on"}
            </button>
            <button type="button" onClick={() => { setPhase("idle"); setError(null); }} className={quietButton}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {phase === "backup" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-700">
            Two-step sign-in is on. Save these 8 backup codes now. Each one works once if you lose your phone, and they
            will not be shown again.
          </p>
          <ul className="grid grid-cols-2 gap-2 rounded-md bg-[#F7F2F6] border border-rule p-4 font-mono text-sm text-black">
            {backupCodes.map((c) => (
              <li key={c} className="select-all">{c}</li>
            ))}
          </ul>
          <button type="button" onClick={() => { setBackupCodes([]); setPhase("idle"); }} className={primaryButton}>
            I have saved them
          </button>
        </div>
      )}

      {phase === "idle" && enabled && (
        <>
          <p className="text-sm text-neutral-600">
            Signing in asks for your password and a code from your authenticator app. Keep your backup codes somewhere safe.
          </p>
          <button type="button" onClick={() => { setPhase("turnoff"); setError(null); }} className={quietButton}>
            Turn off
          </button>
        </>
      )}

      {phase === "turnoff" && (
        <form onSubmit={turnOff} className="space-y-4">
          <p className="text-sm text-neutral-600">To turn it off, confirm with your password and a current code (or a backup code).</p>
          <div>
            <label htmlFor="turnoff-password" className={labelClass}>Password</label>
            <input id="turnoff-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="turnoff-code" className={labelClass}>Code</label>
            <input id="turnoff-code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} placeholder="6-digit or backup code" />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={loading || !password || !code} className={primaryButton}>
              {loading ? "Turning off..." : "Turn off two-step sign-in"}
            </button>
            <button type="button" onClick={() => { setPhase("idle"); setError(null); }} className={quietButton}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
