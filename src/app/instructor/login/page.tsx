"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PiEnvelopeSimple, PiLock, PiSignIn, PiWarningCircle } from "react-icons/pi";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function InstructorLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed.");
      }

      if (data.user.role !== "TUTOR" && data.user.role !== "ADMIN") {
        throw new Error("Access Denied: Instructor portal requires a Tutor or Admin account.");
      }

      window.location.href = "/instructor";
    } catch (err: any) {
      setError(err.message || "Invalid instructor credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-lg p-8 border border-rule space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <BrandLogo href="/" variant="dark" size="md" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-black tracking-tight">Instructor Portal</h1>
          <p className="text-xs text-neutral-500 font-medium">Sign in to manage curriculum, assignments, and analytics.</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200 flex items-center gap-2">
            <PiWarningCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">Instructor Email</label>
            <div className="relative">
              <PiEnvelopeSimple className="absolute left-4 top-3.5 text-neutral-400 w-4 h-4" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#F7F2F6] border border-rule text-sm text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <PiLock className="absolute left-4 top-3.5 text-neutral-400 w-4 h-4" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#F7F2F6] border border-rule text-sm text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 mt-4"
          >
            <PiSignIn className="w-4 h-4" />
            {loading ? "Authenticating..." : "Instructor Log In"}
          </button>
        </form>

        <div className="text-center text-xs text-neutral-500 border-t border-rule pt-4">
          Looking for student platform?{" "}
          <Link href="/login" className="text-[#4A1A45] font-bold hover:underline">
            Go to Student Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
