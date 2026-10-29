// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { TwoFactorCard } from "@/components/auth/TwoFactorCard";
import LoginPage from "@/app/login/page";

type Reply = { ok?: boolean; status?: number; body: unknown };
function mockFetch(...replies: Reply[]) {
  const queue = [...replies];
  const fn = vi.fn(async (_url?: unknown, _init?: RequestInit) => {
    const r = queue.length > 1 ? queue.shift()! : queue[0];
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.body } as Response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}
const bodyOf = (fn: { mock: { calls: any[][] } }, i: number) => JSON.parse((fn.mock.calls[i][1] as RequestInit).body as string);

beforeEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TwoFactorCard", () => {
  it("shows it is off, and offers to turn it on", () => {
    render(<TwoFactorCard enabled={false} />);
    expect(screen.getByText("Off")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Turn on" })).toBeTruthy();
  });

  it("walks through setup: shows the key, takes the code, then shows the backup codes once", async () => {
    const backupCodes = ["AAAAA-BBBBB", "CCCCC-DDDDD", "EEEEE-FFFFF", "GGGGG-HHHHH", "JJJJJ-KKKKK", "LLLLL-MMMMM", "NNNNN-PPPPP", "QQQQQ-RRRRR"];
    const fetchFn = mockFetch(
      { body: { success: true, secret: "ABCDEFGHIJKLMNOPABCDEFGHIJKLMNOP", otpauthUrl: "otpauth://totp/x" } },
      { body: { success: true, backupCodes } }
    );
    render(<TwoFactorCard enabled={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));
    expect(await screen.findByText("ABCD EFGH IJKL MNOP ABCD EFGH IJKL MNOP")).toBeTruthy();
    expect(fetchFn.mock.calls[0][0]).toBe("/api/auth/2fa/setup");

    const confirm = screen.getByRole("button", { name: "Confirm and turn on" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: "123456" } });
    fireEvent.click(confirm);

    expect(await screen.findByText("AAAAA-BBBBB")).toBeTruthy();
    expect(screen.getAllByRole("listitem").filter((li) => /^[A-Z]{5}-[A-Z]{5}$/.test(li.textContent || ""))).toHaveLength(8);
    expect(fetchFn.mock.calls[1][0]).toBe("/api/auth/2fa/enable");
    expect(bodyOf(fetchFn, 1)).toEqual({ code: "123456" });

    fireEvent.click(screen.getByRole("button", { name: "I have saved them" }));
    expect(screen.getByText("On")).toBeTruthy();
    expect(screen.queryByText("AAAAA-BBBBB")).toBeNull(); // gone for good
  });

  it("says so when the code is wrong, and stays on the setup screen", async () => {
    mockFetch(
      { body: { success: true, secret: "ABCDEFGHIJKLMNOPABCDEFGHIJKLMNOP", otpauthUrl: "otpauth://totp/x" } },
      { ok: false, status: 400, body: { error: "That code is not correct. Check the code in your app and try again." } }
    );
    render(<TwoFactorCard enabled={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));
    await screen.findByLabelText("6-digit code");
    fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm and turn on" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("Off")).toBeTruthy();
  });

  it("turning it off needs the password and a code", async () => {
    const fetchFn = mockFetch({ body: { success: true } });
    render(<TwoFactorCard enabled={true} />);
    expect(screen.getByText("On")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    const submit = screen.getByRole("button", { name: "Turn off two-step sign-in" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse" } });
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "123456" } });
    fireEvent.click(submit);

    await waitFor(() => expect(screen.getByText("Off")).toBeTruthy());
    expect(fetchFn.mock.calls[0][0]).toBe("/api/auth/2fa/disable");
    expect(bodyOf(fetchFn, 0)).toEqual({ password: "correct-horse", code: "123456" });
  });
});

describe("the sign-in page with two-step sign-in", () => {
  const fillCredentials = () => {
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "boss@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Your password"), { target: { value: "correct-horse" } });
  };

  it("asks for the code (not an error) when the server needs it, then sends it with the password", async () => {
    const fetchFn = mockFetch(
      { ok: false, status: 401, body: { error: "Enter the 6-digit code from your authenticator app.", code: "TOTP_REQUIRED" } },
      { ok: false, status: 401, body: { error: "That code is not correct.", code: "TOTP_INVALID" } }
    );
    render(<LoginPage />);
    expect(screen.queryByLabelText("Authenticator code")).toBeNull();

    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: /Sign In to Account/ }));

    const field = await screen.findByLabelText("Authenticator code");
    expect(field).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull(); // asking for a code is a step, not a failure
    expect(bodyOf(fetchFn, 0)).toEqual({ email: "boss@test.com", password: "correct-horse" });

    fireEvent.change(field, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign In to Account/ }));
    expect(await screen.findByText("That code is not correct.")).toBeTruthy();
    expect(bodyOf(fetchFn, 1)).toEqual({ email: "boss@test.com", password: "correct-horse", code: "123456" });
  });
});
