"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FiEye, FiEyeOff } from "react-icons/fi";

import { ACADEMIC_STRUCTURE, getDepartmentsForFaculty } from "@/lib/academicStructure";
import { AuthShell, AuthError, authInputClass, authLabelClass, authButtonClass } from "@/components/auth/AuthShell";

const MIN_PASSWORD = 6;

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  const departments = faculty ? getDepartmentsForFaculty(faculty) : [];
  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const ready = name.trim() && email && password.length >= MIN_PASSWORD && faculty && department;

  const handleFacultyChange = (next: string) => {
    setFaculty(next);
    setDepartment("");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters long.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, faculty, department }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed.");
      setNeedsVerification(data.needsVerification === true);
      setRegisteredEmail(email);
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      headline="Start learning today."
      blurb="Create a free student account, then enroll in a course when you are ready."
      points={["Free to join: you only pay when you enroll", "Structured lessons and assignments", "Feedback on every submission"]}
    >
      {registeredEmail ? (
        <div className="space-y-5 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-neutral-900">Check Your Inbox</h2>
            <p className="text-sm text-neutral-600">We sent a verification link to</p>
            <p className="text-sm font-bold text-[#4A1A45] break-all bg-neutral-50 py-2 px-3 rounded-xl border border-neutral-200">{registeredEmail}</p>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {needsVerification
                ? "Open the link in that email to activate your account, then sign in."
                : "You can browse courses now, but you must verify your email before you can enroll and pay."}
            </p>
          </div>
          {needsVerification ? (
            <Link href="/login" className={`${authButtonClass} inline-block`}>Go to Sign In</Link>
          ) : (
            <Link href="/courses" className={`${authButtonClass} inline-block`}>Browse Courses</Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="font-bold text-2xl text-black">Create an account</h1>
            <p className="text-sm text-neutral-500 mt-1">Create your student account. It takes about a minute.</p>
          </div>

          {error && <AuthError message={error} />}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="name" className={authLabelClass}>Full name</label>
              <input id="name" type="text" required autoComplete="name" placeholder="e.g. Alex Rivera" value={name} onChange={(e) => setName(e.target.value)} className={authInputClass} />
            </div>

            <div>
              <label htmlFor="email" className={authLabelClass}>Email</label>
              <input id="email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={authInputClass} />
            </div>

            <div>
              <label htmlFor="password" className={authLabelClass}>Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${authInputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-3 text-neutral-400 hover:text-black"
                >
                  {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
              {passwordTooShort && <p className="text-xs text-red-600 mt-1">Use at least {MIN_PASSWORD} characters.</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="faculty" className={authLabelClass}>Faculty / School</label>
                <select id="faculty" required value={faculty} onChange={(e) => handleFacultyChange(e.target.value)} className={authInputClass}>
                  <option value="">Select faculty</option>
                  {ACADEMIC_STRUCTURE.map((f) => (
                    <option key={f.name} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="department" className={authLabelClass}>Department</label>
                <select id="department" required value={department} disabled={!faculty} onChange={(e) => setDepartment(e.target.value)} className={authInputClass}>
                  <option value="">{faculty ? "Select department" : "Choose a faculty first"}</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="phone" className={authLabelClass}>
                Phone <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input id="phone" type="tel" autoComplete="tel" placeholder="e.g. 0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} className={authInputClass} />
            </div>

            <button type="submit" disabled={loading || !ready} className={authButtonClass}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="text-xs text-neutral-500 text-center leading-relaxed">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="font-semibold text-[#4A1A45] hover:underline">Terms of Service</Link> and{" "}
            <Link href="/privacy" className="font-semibold text-[#4A1A45] hover:underline">Privacy Policy</Link>.
          </p>

          <p className="pt-4 border-t border-neutral-200 text-sm text-neutral-600 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-[#4A1A45] font-bold hover:underline">Sign in</Link>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
