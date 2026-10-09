"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FiShield, FiMail, FiLock, FiLogIn, FiAlertCircle } from "react-icons/fi";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function AdminLoginPage() {
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
      if (!res.ok) throw new Error(data.error || "Login failed.");

      if (data.user.role !== "ADMIN") {
        await fetch("/api/auth/logout", { method: "POST" });
        throw new Error(
          "Access denied. This portal is strictly restricted to platform administrators."
        );
      }

      window.location.href = "/admin";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-2">
            <BrandLogo href="/" variant="dark" size="md" />
          </div>
          <div className="inline-flex p-3 rounded-2xl bg-[#2D0F2A] text-white shadow-md border border-[#4A1A45]/40">
            <FiShield className="w-7 h-7 text-[#D6BDD4]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-black">Superadmin Control Panel</h1>
          <p className="text-xs text-neutral-500 font-medium">
            Restricted access. Authorized platform administrators only.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 border border-neutral-200 shadow-sm space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200 flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">
                Admin Email
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-3.5 text-neutral-400 w-4 h-4" />
                <input
                  type="email"
                  required
                  placeholder="admin@lms.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all placeholder:text-neutral-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-3.5 text-neutral-400 w-4 h-4" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all placeholder:text-neutral-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] disabled:opacity-60 text-white font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 mt-2 shadow-sm"
            >
              <FiLogIn className="w-4 h-4" />
              {loading ? "Authenticating..." : "Enter Admin Console"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-500">
          Not an admin?{" "}
          <Link href="/login" className="text-[#4A1A45] hover:underline font-bold transition-all">
            Student Login
          </Link>
          {" · "}
          <Link href="/instructor/login" className="text-[#4A1A45] hover:underline font-bold transition-all">
            Instructor Login
          </Link>
        </p>
      </div>
    </div>
  );
}
