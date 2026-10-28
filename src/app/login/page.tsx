"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PiEye, PiEyeSlash } from "react-icons/pi";

import { AuthShell, AuthError, authInputClass, authLabelClass, authButtonClass } from "@/components/auth/AuthShell";
import { homePathForRole } from "@/lib/roles";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnverified(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.code === "EMAIL_NOT_VERIFIED") setUnverified(true);
      if (!res.ok) throw new Error(data.error || "Login failed.");
      window.location.href = homePathForRole(data.user.role);
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      headline="Welcome back."
      blurb="Pick up your course where you left off."
      points={["Your progress is saved lesson by lesson", "Assignments are graded as soon as you submit", "Your instructor can review and adjust any grade"]}
    >
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-black">Sign in</h1>
          <p className="text-sm text-neutral-500 mt-1">Use the email and password you registered with.</p>
        </div>

        {error && <AuthError message={error} />}
        {unverified && (
          <p className="text-sm text-neutral-600">
            <Link href="/verify-email" className="font-semibold text-[#4A1A45] hover:underline">Send me a new verification email</Link>
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className={authLabelClass}>Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-neutral-700">Password</label>
              <Link href="/forgot-password" className="text-xs font-semibold text-[#4A1A45] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${authInputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-3 text-neutral-400 hover:text-black"
              >
                {showPw ? <PiEyeSlash className="w-4 h-4" /> : <PiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading || !email || !password} className={authButtonClass}>
            {loading ? "Signing in..." : "Sign In to Account"}
          </button>
        </form>

        <p className="text-xs text-neutral-500 text-center leading-relaxed">
          By signing in you agree to our{" "}
          <Link href="/terms" className="font-semibold text-[#4A1A45] hover:underline">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="font-semibold text-[#4A1A45] hover:underline">Privacy Policy</Link>.
        </p>

        <p className="pt-4 border-t border-rule text-sm text-neutral-600 text-center">
          New here?{" "}
          <Link href="/signup" className="text-[#4A1A45] font-bold hover:underline">Create one free</Link>
        </p>
      </div>
    </AuthShell>
  );
}
