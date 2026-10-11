"use client";

import React, { useState } from "react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { FiArrowRight, FiShield } from "react-icons/fi";

interface PrivyAuthButtonProps {
  label?: string;
  className?: string;
}

function PrivyAuthButtonInner({
  label = "Continue with Google or Web3 (Privy)",
  className,
}: PrivyAuthButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { ready, getAccessToken } = usePrivy();

  const { login } = useLogin({
    onComplete: async () => {
      setSyncing(true);
      setError(null);
      try {
        // The server derives identity from this verified token, not from client-sent fields
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("Could not obtain a Privy session token.");
        }

        const res = await fetch("/api/auth/privy", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to authenticate with LMS.");
        }

        // Redirect to student courses
        window.location.href = "/my-courses";
      } catch (err: any) {
        console.error("[PRIVY SYNC ERROR]", err);
        setError(err.message || "Failed to complete login.");
        setSyncing(false);
      }
    },
    onError: (err) => {
      console.warn("[PRIVY LOGIN ERROR]", err);
      setSyncing(false);
    },
  });

  const handleLoginClick = () => {
    setError(null);
    login();
  };

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        disabled={!ready || syncing}
        onClick={handleLoginClick}
        className={
          className ||
          "w-full py-2.5 px-4 rounded-xl border border-neutral-300 hover:border-[#4A1A45] bg-white hover:bg-[#F7F2F6] text-neutral-900 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
        }
      >
        <span className="flex items-center gap-1.5 font-bold">
          <FiShield className="w-3.5 h-3.5 text-[#4A1A45]" />
          {syncing ? "Connecting Account..." : label}
        </span>
        {!syncing && <FiArrowRight className="w-3.5 h-3.5 text-neutral-400" />}
      </button>

      {error && (
        <p className="text-[11px] text-red-600 font-semibold text-center">{error}</p>
      )}
    </div>
  );
}

/** Shows the social sign-in button only when Privy is configured (otherwise there is no provider to talk to). */
export function PrivyAuthButton(props: PrivyAuthButtonProps) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) return null;
  return <PrivyAuthButtonInner {...props} />;
}
