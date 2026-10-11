"use client";

import React, { useEffect, useRef, useState } from "react";
import { homePathForRole } from "@/lib/roles";

const GSI_SCRIPT = "https://accounts.google.com/gsi/client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Could not load Google sign-in.")));
    if (!existing) {
      script.src = GSI_SCRIPT;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
}

function GoogleAuthButtonInner({ clientId }: { clientId: string }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const handleCredential = async (response: { credential?: string }) => {
      if (!response.credential) {
        setError("Google did not return a sign-in. Please try again.");
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to sign in with Google.");
        // New Google students must pick their faculty and department first
        window.location.href = data.needsProfile ? "/onboarding" : homePathForRole(data.user?.role);
      } catch (err: any) {
        setError(err.message || "Failed to sign in with Google.");
        setBusy(false);
      }
    };

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google) return;
        window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 320,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <div className="w-full space-y-2">
      <div ref={buttonRef} className="flex justify-center min-h-[44px]" aria-busy={busy} />
      {busy && <p className="text-[11px] text-center text-neutral-500 font-semibold">Signing you in...</p>}
      {error && <p className="text-[11px] text-red-600 font-semibold text-center">{error}</p>}
    </div>
  );
}

/** "Continue with Google". Hidden entirely until NEXT_PUBLIC_GOOGLE_CLIENT_ID is set, so there is never a button that cannot work. */
export function GoogleAuthButton() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  return <GoogleAuthButtonInner clientId={clientId} />;
}
