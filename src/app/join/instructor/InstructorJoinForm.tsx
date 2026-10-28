"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PiEye, PiEyeSlash } from "react-icons/pi";

import { ACADEMIC_STRUCTURE, getDepartmentsForFaculty } from "@/lib/academicStructure";
import { AuthShell, AuthError, authInputClass, authLabelClass, authButtonClass } from "@/components/auth/AuthShell";

const MIN_PASSWORD = 8;

export function InstructorJoinForm({ accessKey }: { accessKey: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const departments = faculty ? getDepartmentsForFaculty(faculty) : [];
  const ready = name.trim() && email && password.length >= MIN_PASSWORD && faculty && department;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/instructor-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: accessKey, name, email, password, faculty, department }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create the account.");
      window.location.href = "/instructor";
    } catch (err: any) {
      setError(err.message || "Could not create the account.");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      headline="Teach on Academia."
      blurb="Create your instructor account and build your first course."
      points={["Build courses with lessons and assignments", "Scores and feedback in seconds", "See every student's progress"]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-black">Instructor sign-up</h1>
          <p className="text-sm text-neutral-500 mt-1">This page is private to people with the link.</p>
        </div>

        {error && <AuthError message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className={authLabelClass}>Full name</label>
            <input id="name" type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={authInputClass} />
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
                placeholder={`At least ${MIN_PASSWORD} characters`}
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
                {showPassword ? <PiEyeSlash className="w-4 h-4" /> : <PiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="faculty" className={authLabelClass}>Faculty / School</label>
              <select id="faculty" required value={faculty} onChange={(e) => { setFaculty(e.target.value); setDepartment(""); }} className={authInputClass}>
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

          <button type="submit" disabled={loading || !ready} className={authButtonClass}>
            {loading ? "Creating account..." : "Create instructor account"}
          </button>
        </form>

        <p className="pt-4 border-t border-rule text-sm text-neutral-600 text-center">
          Already have an instructor account?{" "}
          <Link href="/instructor/login" className="text-[#4A1A45] font-bold hover:underline">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
