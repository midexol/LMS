"use client";

import React, { useState } from "react";
import { FiAlertCircle, FiArrowRight } from "react-icons/fi";
import { ACADEMIC_STRUCTURE, getDepartmentsForFaculty } from "@/lib/academicStructure";
import { BrandLogo } from "@/components/ui/BrandLogo";

/** One-time step: a new student picks their faculty and department. Both are required. */
export function OnboardingClient({ name, email }: { name: string; email: string }) {
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const departments = faculty ? getDepartmentsForFaculty(faculty) : [];

  const handleFacultyChange = (value: string) => {
    setFaculty(value);
    setDepartment(""); // the old department belongs to the old faculty
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faculty || !department) {
      setError("Please choose both your faculty and your department.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/student/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, faculty, department }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save your details.");
      window.location.href = "/my-courses";
    } catch (err: any) {
      setError(err.message || "Could not save your details.");
      setSaving(false);
    }
  };

  const selectClass =
    "w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black outline-none focus:border-[#4A1A45] transition-all";

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <div className="mb-8">
        <BrandLogo href="/" variant="dark" size="md" />
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm">
        <div>
          <h1 className="font-bold text-2xl text-black">One last step</h1>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Welcome, {name}. Tell us your faculty and department so we can show you the right courses. You are signed in as {email}.
          </p>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-3 rounded-2xl bg-red-50 border border-red-200">
            <FiAlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="faculty" className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
            Faculty / School
          </label>
          <select id="faculty" value={faculty} onChange={(e) => handleFacultyChange(e.target.value)} className={selectClass} required>
            <option value="">Select your faculty</option>
            {ACADEMIC_STRUCTURE.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="department" className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
            Department
          </label>
          <select
            id="department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={selectClass}
            disabled={!faculty}
            required
          >
            <option value="">{faculty ? "Select your department" : "Choose a faculty first"}</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={saving || !faculty || !department}
          className="w-full py-3 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : "Continue to my courses"}
          {!saving && <FiArrowRight className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
