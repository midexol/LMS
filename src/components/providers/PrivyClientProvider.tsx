"use client";

import React from "react";
import { PrivyProvider } from "@privy-io/react-auth";

interface PrivyClientProviderProps {
  children: React.ReactNode;
}

export function PrivyClientProvider({ children }: PrivyClientProviderProps) {
  // Use user's configured Privy App ID from environment, or fallback placeholder
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "clxyzplaceholder_futa_lms";

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#784D28",
          showWalletLoginFirst: false,
          walletList: ["metamask", "coinbase_wallet", "rainbow", "phantom"],
        },
        loginMethods: ["email", "google", "wallet"],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
