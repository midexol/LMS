// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const nav = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => nav.params,
  usePathname: () => "/",
}));

import ResetPasswordPage from "@/app/reset-password/page";
import VerifyEmailPage from "@/app/verify-email/page";
import ForgotPasswordPage from "@/app/forgot-password/page";

function mockFetch(reply: { ok?: boolean; status?: number; body: unknown }) {
  const fn = vi.fn(async (_url?: unknown, _init?: RequestInit) => ({ ok: reply.ok ?? true, status: reply.status ?? 200, json: async () => reply.body }) as Response);
  vi.stubGlobal("fetch", fn);
  return fn;
}
const sentBody = (fn: { mock: { calls: any[][] } }) => JSON.parse((fn.mock.calls.at(-1)![1] as RequestInit).body as string);

beforeEach(() => {
  nav.params = new URLSearchParams();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => cleanup());

describe("Forgot password page", () => {
  const submit = (email = "ada@test.com") => {
    fireEvent.change(screen.getByPlaceholderText("student@example.com"), { target: { value: email } });
    fireEvent.click(screen.getByRole("button", { name: "Send Reset Link" }));
  };

  it("needs an email before the button works", () => {
    render(<ForgotPasswordPage />);
    expect((screen.getByRole("button", { name: "Send Reset Link" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("asks the server to send a reset link and then points the user back to sign in", async () => {
    const fetchFn = mockFetch({ body: { success: true } });
    render(<ForgotPasswordPage />);
    submit();
    expect(await screen.findByText("Return to Sign In")).toBeTruthy();
    expect(fetchFn.mock.calls[0][0]).toBe("/api/auth/forgot-password");
    expect(sentBody(fetchFn)).toEqual({ email: "ada@test.com" });
    expect(screen.getByText(/link expires in 1 hour/)).toBeTruthy();
  });

  it("shows server errors such as rate limiting", async () => {
    mockFetch({ ok: false, status: 429, body: { error: "Too many password reset attempts. Please wait 15 minutes before trying again." } });
    render(<ForgotPasswordPage />);
    submit();
    expect(await screen.findByText(/Too many password reset attempts/)).toBeTruthy();
    expect(screen.queryByText("Return to Sign In")).toBeNull();
  });
});

describe("Reset password page", () => {
  const fill = (password = "purple-giraffe-47", confirm = password) => {
    fireEvent.change(screen.getByPlaceholderText("At least 10 characters"), { target: { value: password } });
    fireEvent.change(screen.getByPlaceholderText("Re-enter password"), { target: { value: confirm } });
  };
  const submit = () => fireEvent.click(screen.getByRole("button", { name: "Save New Password" }));

  it("rejects short and mismatched passwords locally", () => {
    const fetchFn = mockFetch({ body: {} });
    nav.params = new URLSearchParams("token=" + "a".repeat(64));
    render(<ResetPasswordPage />);
    fill("123", "123");
    submit();
    expect(screen.getByText(/meets all the rules/)).toBeTruthy();
    fill("purple-giraffe-47", "different-giraffe-48");
    submit();
    expect(screen.getByText(/do not match/)).toBeTruthy();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sends the token from the emailed link together with the new password", async () => {
    const token = "b".repeat(64);
    nav.params = new URLSearchParams(`token=${token}`);
    const fetchFn = mockFetch({ body: { success: true } });
    render(<ResetPasswordPage />);
    fill();
    submit();
    expect(await screen.findByText("Password Successfully Updated")).toBeTruthy();
    expect(fetchFn.mock.calls[0][0]).toBe("/api/auth/reset-password");
    expect(sentBody(fetchFn)).toEqual({ token, password: "purple-giraffe-47" });
  });

  it("shows an expired-link error from the server and does not claim success", async () => {
    nav.params = new URLSearchParams("token=" + "c".repeat(64));
    mockFetch({ ok: false, status: 400, body: { error: "This password reset link is invalid or has expired. Please request a new one." } });
    render(<ResetPasswordPage />);
    fill();
    submit();
    expect(await screen.findByText(/invalid or has expired/)).toBeTruthy();
    expect(screen.queryByText("Password Successfully Updated")).toBeNull();
  });
});

describe("Verify email page", () => {
  it("verifies automatically using the token in the link", async () => {
    nav.params = new URLSearchParams("token=tok123");
    const fetchFn = mockFetch({ body: { success: true, message: "Email verified successfully! Welcome to ACADEMIA LMS." } });
    render(<VerifyEmailPage />);
    expect(await screen.findByText("Email Verified!")).toBeTruthy();
    expect(fetchFn.mock.calls[0][0]).toBe("/api/auth/verify-email");
    expect(sentBody(fetchFn)).toEqual({ token: "tok123" });
    expect(screen.getByText(/Welcome to ACADEMIA LMS/)).toBeTruthy();
  });

  it("explains a link with no token, without calling the server", async () => {
    const fetchFn = mockFetch({ body: {} });
    render(<VerifyEmailPage />);
    expect(await screen.findByText("Verification Link Issue")).toBeTruthy();
    expect(screen.getByText(/No verification token/)).toBeTruthy();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("shows an invalid or expired link and lets the user request a new one", async () => {
    nav.params = new URLSearchParams("token=old");
    const fetchFn = mockFetch({ ok: false, status: 400, body: { error: "This verification link is invalid or has expired. Please request a new one." } });
    render(<VerifyEmailPage />);
    expect(await screen.findByText("Verification Link Issue")).toBeTruthy();
    expect(screen.getByText(/invalid or has expired/)).toBeTruthy();

    mockFetch({ body: { success: true, message: "If an unverified account matches this email, a new verification link has been sent." } });
    fireEvent.change(screen.getByPlaceholderText("student@example.com"), { target: { value: " ada@test.com " } });
    fireEvent.submit(screen.getByPlaceholderText("student@example.com").closest("form")!);
    expect(await screen.findByText(/new verification link has been sent/)).toBeTruthy();
    expect(fetchFn).toHaveBeenCalled();
  });

  it("sends the trimmed email to the resend endpoint", async () => {
    nav.params = new URLSearchParams("token=old");
    mockFetch({ ok: false, status: 400, body: { error: "expired" } });
    render(<VerifyEmailPage />);
    await screen.findByText("Verification Link Issue");

    const resend = mockFetch({ body: { message: "sent" } });
    fireEvent.change(screen.getByPlaceholderText("student@example.com"), { target: { value: " ada@test.com " } });
    fireEvent.submit(screen.getByPlaceholderText("student@example.com").closest("form")!);
    await waitFor(() => expect(resend).toHaveBeenCalled());
    expect(resend.mock.calls[0][0]).toBe("/api/auth/verify-email/resend");
    expect(sentBody(resend)).toEqual({ email: "ada@test.com" });
  });

  it("copes with a network failure during verification", async () => {
    nav.params = new URLSearchParams("token=tok");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));
    render(<VerifyEmailPage />);
    expect(await screen.findByText("Failed to fetch")).toBeTruthy();
  });
});
