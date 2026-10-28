"use client";

import React, { useState } from "react";
import { isPass } from "@/lib/grading";
import { formatDate } from "@/lib/utils";
import { PiPencilSimple } from "react-icons/pi";

interface TutorSubmissionsReviewerProps {
  initialSubmissions: any[];
}

export function TutorSubmissionsReviewer({ initialSubmissions }: TutorSubmissionsReviewerProps) {
  const [submissions, setSubmissions] = useState<any[]>(initialSubmissions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<number>(0);
  const [editFeedback, setEditFeedback] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const handleStartEdit = (sub: any) => {
    setEditingId(sub.id);
    setEditScore(sub.score || 0);
    setEditFeedback(sub.tutorFeedback || "");
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSaveGradeOverride = async (submissionId: string) => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const res = await fetch("/api/tutor/grade-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          newScore: editScore,
          tutorFeedback: editFeedback,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save override.");

      if (data.success) {
        setSubmissions(
          submissions.map((s) =>
            s.id === submissionId
              ? { ...s, score: editScore, tutorFeedback: editFeedback }
              : s
          )
        );
        setEditingId(null);
        setSaveSuccess(submissionId);
        setTimeout(() => setSaveSuccess(null), 2500);
      }
    } catch (e: any) {
      setSaveError(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 rounded-lg bg-white border border-rule space-y-6">
      <h2 className="text-xl font-bold text-black flex items-center gap-2 border-b border-rule pb-3">
        Student Submissions &amp; Grade Override Reviewer
      </h2>

      {saveError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
          {saveError}
        </div>
      )}

      {submissions.length === 0 ? (
        <p className="text-xs text-neutral-500 italic text-center py-8">
          No student submissions yet. They will appear here once students submit assignments.
        </p>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const isEditing = editingId === sub.id;
            const maxScore = sub.assignment?.maxScore || 100;
            const scorePercent = sub.score !== null ? Math.round((sub.score / maxScore) * 100) : null;

            return (
              <div
                key={sub.id}
                data-testid="submission-card"
                className="p-6 rounded-xl bg-[#F7F2F6] border border-rule space-y-3"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#4A1A45] uppercase tracking-wider">
                      {sub.courseTitle}
                    </span>
                    <h3 className="font-bold text-black text-sm mt-0.5">
                      {sub.assignment?.title || "Assignment"}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                      <span>
                        Student: <strong className="text-black">{sub.student?.name || sub.studentId}</strong>
                      </span>
                      <span className="text-neutral-300">|</span>
                      <span>{formatDate(sub.submittedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {saveSuccess === sub.id && (
                      <span className="text-xs text-black font-bold flex items-center gap-1">
                        Saved
                      </span>
                    )}
                    <span
                      className={`text-sm font-bold px-3 py-1 rounded-full border ${
                        scorePercent !== null && isPass(scorePercent)
                          ? "bg-[#4A1A45] text-white border-[#4A1A45]"
                          : scorePercent !== null
                          ? "bg-[#E4D5E2] text-neutral-800 border-neutral-300"
                          : "bg-[#F3EAF2] text-neutral-600 border-rule"
                      }`}
                    >
                      {sub.score !== null ? `${sub.score} / ${maxScore}` : "Ungraded"}
                    </span>

                    {!isEditing && (
                      <button
                        onClick={() => handleStartEdit(sub)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-bold text-black flex items-center gap-1.5 hover:bg-[#F3EAF2] transition-all"
                      >
                        <PiPencilSimple className="w-3.5 h-3.5" /> Override
                      </button>
                    )}
                  </div>
                </div>

                {/* Student answer */}
                <div className="p-4 rounded-xl bg-white border border-rule">
                  <p className="text-[11px] font-bold text-neutral-500 mb-1 uppercase tracking-wider">Student Answer:</p>
                  <p className="text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed">
                    {sub.content}
                  </p>
                </div>

                {/* AI Feedback */}
                {sub.aiFeedback && (
                  <div className="p-4 rounded-xl bg-white border border-rule">
                    <p className="text-[11px] font-bold text-[#4A1A45] mb-1 uppercase tracking-wider">Automated Evaluation Feedback:</p>
                    <p className="text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed">
                      {sub.aiFeedback}
                    </p>
                  </div>
                )}

                {/* Tutor Feedback (existing) */}
                {sub.tutorFeedback && !isEditing && (
                  <div className="p-4 rounded-xl bg-[#F3EAF2] border border-neutral-300">
                    <p className="text-[11px] font-bold text-black mb-1 uppercase tracking-wider">Your Override Note:</p>
                    <p className="text-xs text-neutral-800 leading-relaxed">{sub.tutorFeedback}</p>
                  </div>
                )}

                {/* Override Form */}
                {isEditing && (
                  <div className="p-5 rounded-xl bg-white border-2 border-[#4A1A45] space-y-3 mt-2">
                    <h4 className="font-bold text-black text-xs flex items-center gap-1.5">
                      <PiPencilSimple className="w-3.5 h-3.5 text-[#4A1A45]" />
                      Tutor Grade Override
                    </h4>
                    <div className="flex gap-4 flex-wrap">
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 mb-1 uppercase tracking-wider">
                          Adjusted Score (max {maxScore})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={maxScore}
                          value={editScore}
                          onChange={(e) => setEditScore(Number(e.target.value))}
                          className="px-3 py-1.5 rounded-lg bg-[#F7F2F6] border border-rule text-xs text-black outline-none focus:border-[#4A1A45] w-28"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] font-bold text-neutral-700 mb-1 uppercase tracking-wider">
                          Tutor Feedback Note
                        </label>
                        <input
                          type="text"
                          placeholder="Explain your grade adjustment..."
                          value={editFeedback}
                          onChange={(e) => setEditFeedback(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#F7F2F6] border border-rule text-xs text-black outline-none focus:border-[#4A1A45]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => { setEditingId(null); setSaveError(null); }}
                        className="px-3 py-1.5 rounded-lg bg-[#F3EAF2] border border-rule text-neutral-700 font-bold text-xs hover:bg-[#E4D5E2]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveGradeOverride(sub.id)}
                        disabled={saving}
                        className="px-4 py-1.5 rounded-lg bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Save Override"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
