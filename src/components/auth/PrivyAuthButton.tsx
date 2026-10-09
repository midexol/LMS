"use client";

import React, { useState } from "react";
import { useLogin, usePrivy, User } from "@privy-io/react-auth";
import { FiArrowRight, FiShield } from "react-icons/fi";

interface PrivyAuthButtonProps {
  label?: string;
  className?: string;
}

export function PrivyAuthButton({
  label = "Continue with Google or Web3 (Privy)",
  className,
}: PrivyAuthButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { ready } = usePrivy();

  const { login } = useLogin({
    onComplete: async (privyUser: User) => {
      setSyncing(true);
      setError(null);
      try {
        const email =
          privyUser.email?.address ||
          privyUser.google?.email ||
          privyUser.apple?.email ||
          null;

        const walletAddress = privyUser.wallet?.address || null;
        const name = privyUser.google?.name || null;

        const res = await fetch("/api/auth/privy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privyId: privyUser.id,
            email,
            name,
            walletAddress,
          }),
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
