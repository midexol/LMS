"use client";

import React, { useState } from "react";
import {
  FiPlus, FiTrash2, FiZap, FiBookOpen, FiSave, FiCheckCircle,
  FiFileText, FiVideo, FiHelpCircle, FiLink, FiAlertCircle,
} from "react-icons/fi";

interface LessonDraft {
  title: string;
  content: string;
  videoUrl: string;
  resourceName: string;
  resourceUrl: string;
  assignmentPrompt: string;
  assignmentReferenceAnswer: string;
}

interface ModuleDraft {
  title: string;
  lessons: LessonDraft[];
}

const CATEGORIES = [
  "Software Engineering",
  "Computer Science",
  "Data Science & AI",
  "Design & UX",
  "Business & Management",
  "General",
];

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const defaultLesson = (): LessonDraft => ({
  title: "Lesson 1: Key Topic Overview",
  content: "",
  videoUrl: "",
  resourceName: "",
  resourceUrl: "",
  assignmentPrompt: "",
  assignmentReferenceAnswer: "",
});

export function CourseBuilderWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Software Engineering");
  const [level, setLevel] = useState("Beginner");
  const [price, setPrice] = useState("89.99");
  const [description, setDescription] = useState("");
  const [modules, setModules] = useState<ModuleDraft[]>([
    {
      title: "Module 1: Foundations & Core Concepts",
      lessons: [
        {
          title: "Lesson 1: Introduction and Principles",
          content: "Overview of fundamental principles, concepts, and initial setup instructions.",
          videoUrl: "",
          resourceName: "",
          resourceUrl: "",
          assignmentPrompt: "Explain the main principles covered in this lesson.",
          assignmentReferenceAnswer:
            "Key principles include core architecture, state management, and component breakdown.",
        },
      ],
    },
  ]);

  const [aiTopic, setAiTopic] = useState("");
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  // Validate Step 1 before proceeding
  const step1Valid = title.trim().length > 0 && description.trim().length > 0;

  // AI Outline Generation
  const handleGenerateOutlineAI = async () => {
    if (!aiTopic.trim()) return;
    setGeneratingOutline(true);
    try {
      const res = await fetch("/api/tutor/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_outline", topic: aiTopic }),
      });
      const data = await res.json();
      if (data.success && data.outline?.modules) {
        const formattedModules: ModuleDraft[] = data.outline.modules.map((m: any) => ({
          title: m.title,
          lessons: m.lessons.map((l: any) => ({
            title: l.title,
            content: l.content,
            videoUrl: "",
            resourceName: "",
            resourceUrl: "",
            assignmentPrompt: `Assignment: ${l.title}`,
            assignmentReferenceAnswer: `Reference answer rubric for ${l.title}.`,
          })),
        }));
        setModules(formattedModules);
        if (!title) setTitle(aiTopic);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingOutline(false);
    }
  };

  const addModule = () => {
    setModules([
      ...modules,
      { title: `Module ${modules.length + 1}: New Topic`, lessons: [defaultLesson()] },
    ]);
  };

  const removeModule = (index: number) => setModules(modules.filter((_, i) => i !== index));

  const addLesson = (moduleIndex: number) => {
    const updated = [...modules];
    const l = defaultLesson();
    l.title = `Lesson ${updated[moduleIndex].lessons.length + 1}: New Subtopic`;
    updated[moduleIndex].lessons.push(l);
    setModules(updated);
  };

  const removeLesson = (moduleIndex: number, lessonIndex: number) => {
    const updated = [...modules];
    updated[moduleIndex].lessons = updated[moduleIndex].lessons.filter((_, i) => i !== lessonIndex);
    setModules(updated);
  };

  const updateLesson = (
    moduleIndex: number,
    lessonIndex: number,
    field: keyof LessonDraft,
    value: string
  ) => {
    const updated = [...modules];
    updated[moduleIndex].lessons[lessonIndex][field] = value;
    setModules(updated);
  };

  const handleGenerateRubricAI = async (moduleIndex: number, lessonIndex: number) => {
    const prompt = modules[moduleIndex].lessons[lessonIndex].assignmentPrompt;
    if (!prompt.trim()) return;
    try {
      const res = await fetch("/api/tutor/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_rubric", prompt }),
      });
      const data = await res.json();
      if (data.success && data.rubric?.referenceAnswer) {
        updateLesson(moduleIndex, lessonIndex, "assignmentReferenceAnswer", data.rubric.referenceAnswer);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCourse = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/tutor/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, level, price: parseFloat(price) || 0, description, modules }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(true);
        setTimeout(() => { window.location.href = "/instructor"; }, 1500);
      } else {
        setSaveError(data.error || "Failed to save course.");
      }
    } catch (e: any) {
      setSaveError(e.message || "Network error.");
    } finally {
      setSaving(false);
    }
  };

  // Shared input classes
  const inputCls =
    "w-full px-4 py-3 rounded-xl bg-white border border-neutral-200 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black transition-all";
  const smallInputCls =
    "w-full px-3 py-2 rounded-lg bg-white border border-neutral-200 text-xs text-black outline-none focus:border-black focus:ring-1 focus:ring-black transition-all";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Step Navigation */}
      <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm flex items-center justify-around">
        {([1, 2, 3] as const).map((s) => (
          <button
            key={s}
            onClick={() => { if (s > 1 && !step1Valid) return; setStep(s); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              step === s
                ? "bg-black text-white shadow-sm"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? "bg-white text-black" : "bg-neutral-100 text-neutral-800"
              }`}
            >
              {s}
            </span>
            {s === 1 ? "Course Info" : s === 2 ? "Modules & Lessons" : "Review & Publish"}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="p-8 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-6">
          <div className="border-b border-neutral-200 pb-4">
            <h3 className="text-xl font-bold text-black flex items-center gap-2">
              <FiBookOpen className="w-6 h-6 text-[#784D28]" />
              Step 1: Course Overview & AI Syllabus Helper
            </h3>
            <p className="text-sm text-neutral-500 mt-1">
              Enter course details or use AI to generate a full syllabus.
            </p>
          </div>

          {/* AI Syllabus Box */}
          <div className="p-5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-black text-sm flex items-center gap-2">
                <FiZap className="w-4 h-4 text-[#784D28]" />
                AI Syllabus Generator
              </h4>
              <span className="text-xs text-[#784D28] font-bold uppercase tracking-wider">Instant Course Structure</span>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="e.g. Master React and TypeScript for Production"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerateOutlineAI()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-neutral-200 text-sm text-black outline-none focus:border-black transition-all"
              />
              <button
                type="button"
                onClick={handleGenerateOutlineAI}
                disabled={generatingOutline || !aiTopic.trim()}
                className="px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
              >
                {generatingOutline ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-2">Course Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Advanced Next.js and Prisma Architecture"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputCls}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Difficulty Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className={inputCls}
              >
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Course Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="89.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Course Description *</label>
            <textarea
              rows={4}
              required
              placeholder="Describe what students will learn, key skills gained, and prerequisites..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => step1Valid && setStep(2)}
              disabled={!step1Valid}
              className="px-6 py-3 rounded-xl bg-black hover:bg-neutral-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
            >
              Continue to Modules &amp; Lessons
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="p-8 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <div>
              <h3 className="text-xl font-bold text-black flex items-center gap-2">
                <FiFileText className="w-6 h-6 text-[#784D28]" />
                Step 2: Modules, Lessons & Rubrics
              </h3>
              <p className="text-sm text-neutral-500 mt-1">
                Structure your curriculum and set reference answers for AI auto-grading.
              </p>
            </div>
            <button
              onClick={addModule}
              className="px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
            >
              <FiPlus className="w-4 h-4" /> Add Module
            </button>
          </div>

          <div className="space-y-6">
            {modules.map((moduleItem, mIdx) => (
              <div
                key={mIdx}
                className="p-6 rounded-xl bg-neutral-50 border border-neutral-200 space-y-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <input
                    type="text"
                    value={moduleItem.title}
                    onChange={(e) => {
                      const updated = [...modules];
                      updated[mIdx].title = e.target.value;
                      setModules(updated);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-white border border-neutral-200 text-sm font-bold text-black outline-none focus:border-black"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addLesson(mIdx)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-semibold text-black flex items-center gap-1 hover:border-black shadow-sm"
                    >
                      <FiPlus className="w-3.5 h-3.5" /> Add Lesson
                    </button>
                    {modules.length > 1 && (
                      <button
                        onClick={() => removeModule(mIdx)}
                        className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pl-4 border-l-2 border-neutral-200">
                  {moduleItem.lessons.map((lesson, lIdx) => (
                    <div
                      key={lIdx}
                      className="p-5 rounded-xl bg-white border border-neutral-200 space-y-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="text"
                          placeholder="Lesson Title"
                          value={lesson.title}
                          onChange={(e) => updateLesson(mIdx, lIdx, "title", e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs font-bold text-black outline-none focus:border-black"
                        />
                        {moduleItem.lessons.length > 1 && (
                          <button
                            onClick={() => removeLesson(mIdx, lIdx)}
                            className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Lesson Content */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                          <FiFileText className="w-3 h-3" /> Lesson Content / Material Notes
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Lesson explanation and key reading points..."
                          value={lesson.content}
                          onChange={(e) => updateLesson(mIdx, lIdx, "content", e.target.value)}
                          className={smallInputCls}
                        />
                      </div>

                      {/* Video URL */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                          <FiVideo className="w-3 h-3" /> Video URL (YouTube Embed or MP4)
                        </label>
                        <input
                          type="url"
                          placeholder="https://www.youtube.com/embed/..."
                          value={lesson.videoUrl}
                          onChange={(e) => updateLesson(mIdx, lIdx, "videoUrl", e.target.value)}
                          className={smallInputCls}
                        />
                      </div>

                      {/* Resource Attachment */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                            <FiLink className="w-3 h-3" /> Resource File Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Lecture Notes.pdf"
                            value={lesson.resourceName}
                            onChange={(e) => updateLesson(mIdx, lIdx, "resourceName", e.target.value)}
                            className={smallInputCls}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                            <FiLink className="w-3 h-3" /> Resource Download URL
                          </label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={lesson.resourceUrl}
                            onChange={(e) => updateLesson(mIdx, lIdx, "resourceUrl", e.target.value)}
                            className={smallInputCls}
                          />
                        </div>
                      </div>

                      {/* Assignment */}
                      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                        <span className="text-[11px] font-bold text-[#784D28] flex items-center gap-1 uppercase tracking-wider">
                          <FiHelpCircle className="w-3.5 h-3.5 text-[#784D28]" /> Lesson Assignment (Optional)
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. Explain how component lifecycle works in React..."
                          value={lesson.assignmentPrompt}
                          onChange={(e) => updateLesson(mIdx, lIdx, "assignmentPrompt", e.target.value)}
                          className={smallInputCls}
                        />

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                              Model Answer &amp; Grading Rubric
                            </label>
                            <button
                              type="button"
                              onClick={() => handleGenerateRubricAI(mIdx, lIdx)}
                              disabled={!lesson.assignmentPrompt.trim()}
                              className="text-[10px] px-2 py-0.5 rounded bg-black text-white font-bold flex items-center gap-1 disabled:opacity-50 shadow-sm"
                            >
                              <FiZap className="w-3 h-3 text-[#D4A373]" /> Auto-Generate
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            placeholder="Specify benchmark answers and criteria for AI auto-grading..."
                            value={lesson.assignmentReferenceAnswer}
                            onChange={(e) =>
                              updateLesson(mIdx, lIdx, "assignmentReferenceAnswer", e.target.value)
                            }
                            className={smallInputCls}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
            >
              Review &amp; Publish
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="p-8 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-6">
          <div className="border-b border-neutral-200 pb-4">
            <h3 className="text-xl font-bold text-black flex items-center gap-2">
              <FiCheckCircle className="w-6 h-6 text-black" />
              Step 3: Final Review &amp; Publish
            </h3>
            <p className="text-sm text-neutral-500 mt-1">
              Review your course details before making it live for student enrollment.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-neutral-50 border border-neutral-200 space-y-4">
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-[11px] font-bold text-[#784D28] uppercase tracking-wider">{category}</span>
                <span className="text-[11px] font-bold text-neutral-400">|</span>
                <span className="text-[11px] font-bold text-neutral-500">{level}</span>
              </div>
              <h2 className="text-2xl font-bold text-black">{title || "Untitled Course"}</h2>
              <p className="text-lg font-black text-black mt-1">${price}</p>
              <p className="text-sm text-neutral-600 mt-2">{description || "No description provided."}</p>
            </div>

            <div className="border-t border-neutral-200 pt-4">
              <h4 className="font-bold text-black text-sm mb-3 uppercase tracking-wider">
                Curriculum ({modules.length} modules,{" "}
                {modules.reduce((a, m) => a + m.lessons.length, 0)} lessons)
              </h4>
              <div className="space-y-2">
                {modules.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-white border border-neutral-200">
                    <h5 className="font-bold text-xs text-black">{m.title}</h5>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {m.lessons.length} lessons |{" "}
                      {m.lessons.filter((l) => l.assignmentPrompt).length} assignments |{" "}
                      {m.lessons.filter((l) => l.videoUrl).length} with video
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {saveError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4 shrink-0" />
              {saveError}
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-neutral-100 text-black font-bold text-sm border border-neutral-300 flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5 text-black" />
              Course Published Successfully! Redirecting to dashboard...
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all"
            >
              Back
            </button>
            <button
              onClick={handleSaveCourse}
              disabled={saving || successMsg}
              className="px-8 py-3.5 rounded-xl bg-black hover:bg-neutral-800 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
            >
              <FiSave className="w-5 h-5" />
              {saving ? "Publishing..." : "Publish Course Now"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
