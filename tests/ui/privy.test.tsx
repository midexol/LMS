// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const privy = vi.hoisted(() => ({
  login: vi.fn(),
  getAccessToken: vi.fn(),
  onComplete: undefined as undefined | ((user: unknown) => Promise<void>),
  providerProps: undefined as any,
}));

vi.mock("@privy-io/react-auth", () => ({
  PrivyProvider: (props: any) => {
    privy.providerProps = props;
    return <div data-testid="privy-provider">{props.children}</div>;
  },
  usePrivy: () => ({ ready: true, getAccessToken: privy.getAccessToken }),
  useLogin: (opts: { onComplete: (user: unknown) => Promise<void> }) => {
    privy.onComplete = opts.onComplete;
    return { login: privy.login };
  },
}));

import { PrivyClientProvider } from "@/components/providers/PrivyClientProvider";
import { PrivyAuthButton } from "@/components/auth/PrivyAuthButton";

beforeEach(() => {
  privy.login.mockReset();
  privy.getAccessToken.mockReset();
  privy.onComplete = undefined;
  privy.providerProps = undefined;
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => cleanup());

describe("PrivyClientProvider", () => {
  it("never starts Privy with a made-up app id: without configuration it renders the page untouched", () => {
    render(
      <PrivyClientProvider>
        <p>page content</p>
      </PrivyClientProvider>
    );
    expect(screen.getByText("page content")).toBeTruthy();
    expect(screen.queryByTestId("privy-provider")).toBeNull();
  });

  it("uses the configured app id and the email, Google and wallet login methods", () => {
    vi.stubEnv("NEXT_PUBLIC_PRIVY_APP_ID", "app_real_123");
    render(
      <PrivyClientProvider>
        <p>page content</p>
      </PrivyClientProvider>
    );
    expect(screen.getByTestId("privy-provider")).toBeTruthy();
    expect(privy.providerProps.appId).toBe("app_real_123");
    expect(privy.providerProps.appId).not.toMatch(/placeholder/i);
    expect(privy.providerProps.config.loginMethods).toEqual(["email", "google", "wallet"]);
  });
});

describe("PrivyAuthButton", () => {
  it("is hidden when Privy is not configured (a button that can never work is worse than none)", () => {
    const { container } = render(<PrivyAuthButton />);
    expect(container.innerHTML).toBe("");
  });

  describe("when configured", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_PRIVY_APP_ID", "app_real_123");
    });

    it("opens the Privy login window", () => {
      render(<PrivyAuthButton label="Continue with Google" />);
      fireEvent.click(screen.getByRole("button", { name: /Continue with Google/ }));
      expect(privy.login).toHaveBeenCalledOnce();
    });

    it("after login, proves identity to the server with Privy's access token, NOT with an email in the body", async () => {
      const fetchFn = vi.fn(async (_url?: unknown, _init?: RequestInit) => ({ ok: true, json: async () => ({ success: true }) }) as Response);
      vi.stubGlobal("fetch", fetchFn);
      vi.stubGlobal("location", { href: "" });
      privy.getAccessToken.mockResolvedValue("privy-access-token");

      render(<PrivyAuthButton />);
      await privy.onComplete!({ id: "did:privy:1", email: { address: "attacker-chosen@test.com" } });

      const [url, init] = fetchFn.mock.calls[0];
      expect(url).toBe("/api/auth/privy");
      expect((init as RequestInit).method).toBe("POST");
      expect((init as RequestInit).headers).toEqual({ Authorization: "Bearer privy-access-token" });
      expect((init as RequestInit).body).toBeUndefined(); // identity comes from the verified token only
      expect((globalThis as any).location.href).toBe("/my-courses");
    });

    it("explains the problem when no access token can be obtained, and never calls the server", async () => {
      const fetchFn = vi.fn();
      vi.stubGlobal("fetch", fetchFn);
      privy.getAccessToken.mockResolvedValue(null);

      render(<PrivyAuthButton />);
      await privy.onComplete!({ id: "did:privy:1" });

      expect(await screen.findByText("Could not obtain a Privy session token.")).toBeTruthy();
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("shows the server's refusal and lets the user try again", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({ error: "Invalid or expired Privy session." }) }) as Response));
      vi.stubGlobal("location", { href: "" });
      privy.getAccessToken.mockResolvedValue("tok");

      render(<PrivyAuthButton />);
      await privy.onComplete!({ id: "did:privy:1" });

      expect(await screen.findByText("Invalid or expired Privy session.")).toBeTruthy();
      expect((globalThis as any).location.href).toBe("");
      await waitFor(() => expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(false));
    });
  });
});
