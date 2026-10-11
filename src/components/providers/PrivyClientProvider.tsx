"use client";

import React from "react";
import { PrivyProvider } from "@privy-io/react-auth";

interface PrivyClientProviderProps {
  children: React.ReactNode;
}

export function PrivyClientProvider({ children }: PrivyClientProviderProps) {
  // Without a real Privy app id there is no social sign-in: render the app normally and let the
  // Privy button hide itself, instead of starting Privy with a made-up id that can never work.
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#4A1A45",
          logo: "/logo.svg",
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
