"use client";

import { isSafeRenderUrl } from "@/lib/safeUrl";
import React, { useState, useRef } from "react";
import { PiSpinner, PiTrash, PiX } from "react-icons/pi";
import { ACADEMIC_STRUCTURE, getDepartmentsForFaculty } from "@/lib/academicStructure";
import { formatNgn } from "@/lib/utils";
import { getBrowserStorage } from "@/lib/storageClient";



// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const defaultLesson = (): LessonDraft => ({
  title: "",
  content: "",
  videoUrl: "",
  resourceName: "",
  resourceUrl: "",
  assignmentPrompt: "",
  assignmentReferenceAnswer: "",
});

// ─────────────────────────────────────────────────────────────
// Shared file-upload hook
// ─────────────────────────────────────────────────────────────
function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<{ url: string; name: string } | null> => {
    setUploading(true);
    setError(null);
    try {
      // 1. Ask the server for a one-time signed upload URL (validates role, type, size)
      const res = await fetch("/api/tutor/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Upload failed.");
        return null;
      }

      // 2. Upload straight to Supabase Storage, bypassing the serverless body size limit
      const { error: uploadError } = await getBrowserStorage()
        .storage.from(data.bucket)
        .uploadToSignedUrl(data.path, data.token, file, { contentType: data.contentType });
      if (uploadError) {
        setError(uploadError.message || "Upload failed.");
        return null;
      }

      return { url: data.url, name: data.name };
    } catch (e: any) {
      setError(e.message || "Upload failed.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error, clearError: () => setError(null) };
}

// ─────────────────────────────────────────────────────────────
// Inline file picker button component
// ─────────────────────────────────────────────────────────────
function FilePickerButton({
  accept,
  onPicked,
  uploading,
  label,
  icon,
}: {
  accept: string;
  onPicked: (file: File) => void;
  uploading: boolean;
  label: string;
  icon?: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPicked(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F3EAF2] border border-neutral-300 text-xs font-bold text-black hover:bg-[#E4D5E2] disabled:opacity-60 transition-all"
      >
        {uploading ? <PiSpinner className="w-3.5 h-3.5 animate-spin" /> : icon}
        {uploading ? "Uploading..." : label}
      </button>
    </>
  );
}

interface CourseBuilderWizardProps {
  initialCourse?: any;
  onClose?: () => void;
  onSuccess?: () => void;
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export function CourseBuilderWizard({ initialCourse, onClose, onSuccess }: CourseBuilderWizardProps = {}) {
  const isEditing = Boolean(initialCourse?.id);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — Course Info
  const [title, setTitle]           = useState(initialCourse?.title || "");
  const [faculty, setFaculty]       = useState(initialCourse?.faculty || initialCourse?.category || ACADEMIC_STRUCTURE[0].name);
  const [department, setDepartment] = useState(initialCourse?.department || ACADEMIC_STRUCTURE[0].departments[0]);
  const [level, setLevel]           = useState(initialCourse?.level || "Beginner");
  const [price, setPrice]           = useState(String(initialCourse?.price ?? 0));
  const [description, setDescription] = useState(initialCourse?.description || "");
  const [coverImage, setCoverImage] = useState(initialCourse?.coverImage || ""); // optional cover URL

  const handleFacultyChange = (newFac: string) => {
    setFaculty(newFac);
    const depts = getDepartmentsForFaculty(newFac);
    setDepartment(depts[0] || "");
  };

  // Step 2 — Modules & Lessons
  const [modules, setModules] = useState<ModuleDraft[]>(
    initialCourse?.modules && initialCourse.modules.length > 0
      ? initialCourse.modules.map((m: any) => ({
          title: m.title,
          lessons: m.lessons.map((l: any) => ({
            title: l.title,
            content: l.content || "",
            videoUrl: l.videoUrl || "",
            resourceName: l.resourceName || "",
            resourceUrl: l.resourceUrl || "",
            assignmentPrompt: l.assignments?.[0]?.prompt || "",
            assignmentReferenceAnswer: l.assignments?.[0]?.referenceAnswer || "",
          })),
        }))
      : [
          {
            title: "Module 1: Foundations",
            lessons: [defaultLesson()],
          },
        ]
  );

  // AI helpers
  const [aiTopic, setAiTopic]               = useState("");
  const [generatingOutline, setGeneratingOutline] = useState(false);

  // Save state
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  // Cover image uploader
  const coverUpload = useFileUpload();

  const step1Valid = title.trim().length > 0 && description.trim().length > 0;

  // ──── AI Outline ────
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
        const formatted: ModuleDraft[] = data.outline.modules.map((m: any) => ({
          title: m.title,
          lessons: m.lessons.map((l: any) => ({
            ...defaultLesson(),
            title: l.title,
            content: l.content || "",
            assignmentPrompt: `Assignment: ${l.title}`,
            assignmentReferenceAnswer: `Reference rubric for ${l.title}.`,
          })),
        }));
        setModules(formatted);
        if (!title) setTitle(aiTopic);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingOutline(false);
    }
  };

  // ──── Module/Lesson helpers ────
  const addModule = () =>
    setModules([...modules, { title: `Module ${modules.length + 1}: New Topic`, lessons: [defaultLesson()] }]);

  const removeModule = (i: number) => setModules(modules.filter((_, idx) => idx !== i));

  const addLesson = (mi: number) => {
    const updated = [...modules];
    const l = defaultLesson();
    l.title = `Lesson ${updated[mi].lessons.length + 1}: New Topic`;
    updated[mi].lessons.push(l);
    setModules(updated);
  };

  const removeLesson = (mi: number, li: number) => {
    const updated = [...modules];
    updated[mi].lessons = updated[mi].lessons.filter((_, idx) => idx !== li);
    setModules(updated);
  };

  const updateLesson = (mi: number, li: number, field: keyof LessonDraft, value: string) => {
    const updated = [...modules];
    updated[mi].lessons[li][field] = value;
    setModules(updated);
  };

  const updateModuleTitle = (mi: number, val: string) => {
    const updated = [...modules];
    updated[mi].title = val;
    setModules(updated);
  };

  // ──── AI Rubric ────
  const handleGenerateRubric = async (mi: number, li: number) => {
    const prompt = modules[mi].lessons[li].assignmentPrompt;
    if (!prompt.trim()) return;
    try {
      const res = await fetch("/api/tutor/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_rubric", prompt }),
      });
      const data = await res.json();
      if (data.success && data.rubric?.referenceAnswer) {
        updateLesson(mi, li, "assignmentReferenceAnswer", data.rubric.referenceAnswer);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ──── Save ────
  const handleSaveCourse = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload: any = {
        title,
        category: faculty,
        faculty,
        department,
        level,
        price: parseFloat(price) || 0,
        description,
        coverImage: coverImage || null,
        modules,
      };
      if (isEditing) {
        payload.courseId = initialCourse.id;
      }

      const res = await fetch("/api/tutor/courses", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(true);
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            window.location.href = "/instructor";
          }
        }, 1500);
      } else {
        setSaveError(data.error || "Failed to save course.");
      }
    } catch (e: any) {
      setSaveError(e.message || "Network error.");
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Shared styles
  // ─────────────────────────────────────────────────────────────
  const inputCls =
    "w-full px-4 py-3 rounded-xl bg-white border border-rule text-sm text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all";
  const smallInputCls =
    "w-full px-3 py-2 rounded-lg bg-white border border-rule text-xs text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all";
  const labelCls = "block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5";

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">

      {/* ── Step Navigator ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 p-3 rounded-lg bg-white border border-rule flex items-center justify-around">
          {([1, 2, 3] as const).map((s) => (
            <button
              key={s}
              onClick={() => { if (s > 1 && !step1Valid) return; setStep(s); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                step === s ? "bg-[#4A1A45] text-white " : "text-neutral-500 hover:text-[#4A1A45]"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? "bg-white text-[#4A1A45]" : "bg-[#F3EAF2] text-neutral-800"
              }`}>{s}</span>
              {s === 1 ? "Course Info" : s === 2 ? "Modules & Lessons" : isEditing ? "Review & Update" : "Review & Publish"}
            </button>
          ))}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-3 rounded-lg bg-white border border-rule hover:bg-[#F3EAF2] text-black font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <PiX className="w-4 h-4" /> Cancel
          </button>
        )}
      </div>

      {/* ══════════════════════════════ STEP 1 ══════════════════════════════ */}
      {step === 1 && (
        <div className="p-5 sm:p-8 rounded-lg bg-white border border-rule space-y-4 sm:space-y-6">
          <div className="border-b border-rule pb-4">
            <h3 className="text-xl font-bold text-black flex items-center gap-2">
              {isEditing ? `Edit Course: ${title || initialCourse.title}` : "Step 1: Course Overview"}
            </h3>
            <p className="text-sm text-neutral-500 mt-1">
              {isEditing
                ? "Update core course info and syllabus. Any changes to lessons will update enrolled students' curricula."
                : "Fill in the core details. Cover image is optional — a visual placeholder is generated automatically."}
            </p>
          </div>

          {/* AI Syllabus */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#F7F2F6] border border-rule space-y-3">
            <h4 className="font-bold text-black text-sm flex items-center gap-2">
              Curriculum Template Generator
              <span className="ml-auto text-[10px] text-[#4A1A45] font-bold uppercase tracking-wider">Optional</span>
            </h4>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter a topic to auto-build modules and lessons (e.g. React + TypeScript for Production)"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerateOutlineAI()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-rule text-sm text-black outline-none focus:border-[#4A1A45] transition-all"
              />
              <button
                type="button"
                onClick={handleGenerateOutlineAI}
                disabled={generatingOutline || !aiTopic.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
              >
                {generatingOutline && <PiSpinner className="w-4 h-4 animate-spin" />}
                {generatingOutline ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Title */}
            <div className="md:col-span-2">
              <label className={labelCls}>Course Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Advanced Next.js and Prisma Architecture"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Faculty / School */}
            <div>
              <label className={labelCls}>Faculty / School *</label>
              <select
                value={faculty}
                onChange={(e) => handleFacultyChange(e.target.value)}
                className={inputCls}
              >
                {ACADEMIC_STRUCTURE.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <label className={labelCls}>Department (Unique to this department) *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className={inputCls}
              >
                {getDepartmentsForFaculty(faculty).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Level */}
            <div>
              <label className={labelCls}>Difficulty Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className={labelCls}>Course Tuition Fee (₦ NGN - leave 0 for free)</label>
              <input
                type="number"
                step="100"
                min="0"
                placeholder="e.g. 15000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Cover Image (optional) */}
            <div>
              <label className={labelCls}>Cover Image <span className="text-neutral-400 normal-case font-normal">(optional)</span></label>
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="url"
                  placeholder="https://... or upload below"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full min-w-0 px-4 py-3 rounded-xl bg-white border border-rule text-sm text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all flex-1"
                />
                <div className="shrink-0">
                  <FilePickerButton
                    accept="image/jpeg,image/png,image/webp"
                    uploading={coverUpload.uploading}
                    label="Upload"
                    onPicked={async (file) => {
                      const result = await coverUpload.upload(file);
                      if (result) setCoverImage(result.url);
                    }}
                  />
                </div>
              </div>
              {coverUpload.error && (
                <p className="text-[11px] text-red-600 mt-1">{coverUpload.error}</p>
              )}
              {coverImage && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={coverImage} alt="Cover preview" className="w-14 h-10 object-cover rounded-lg border border-rule" />
                  <button onClick={() => setCoverImage("")} className="text-[11px] text-neutral-500 hover:text-black flex items-center gap-1">
                    <PiX className="w-3 h-3" /> Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Course Description *</label>
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
              className="px-4 sm:px-6 py-3 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              Continue to Modules & Lessons
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════ STEP 2 ══════════════════════════════ */}
      {step === 2 && (
        <div className="p-5 sm:p-8 rounded-lg bg-white border border-rule space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between border-b border-rule pb-4">
            <div>
              <h3 className="text-xl font-bold text-black flex items-center gap-2">
                Step 2: Modules & Lessons
              </h3>
              <p className="text-sm text-neutral-500 mt-1">
                Build your curriculum. Upload PDFs, slides, or videos directly to each lesson.
              </p>
            </div>
            <button
              onClick={addModule}
              className="px-4 py-2.5 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              Add Module
            </button>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {modules.map((mod, mIdx) => (
              <LessonModuleBlock
                key={mIdx}
                mod={mod}
                mIdx={mIdx}
                onModuleTitleChange={(v) => updateModuleTitle(mIdx, v)}
                onAddLesson={() => addLesson(mIdx)}
                onRemoveModule={modules.length > 1 ? () => removeModule(mIdx) : undefined}
                onRemoveLesson={(li) => removeLesson(mIdx, li)}
                onUpdateLesson={(li, field, val) => updateLesson(mIdx, li, field, val)}
                onGenerateRubric={(li) => handleGenerateRubric(mIdx, li)}
                smallInputCls={smallInputCls}
              />
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 sm:px-6 py-3 rounded-xl bg-[#F3EAF2] border border-rule text-neutral-700 font-bold text-xs uppercase tracking-wider hover:bg-[#E4D5E2] transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-4 sm:px-6 py-3 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              Review & Publish
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════ STEP 3 ══════════════════════════════ */}
      {step === 3 && (
        <div className="p-5 sm:p-8 rounded-lg bg-white border border-rule space-y-4 sm:space-y-6">
          <div className="border-b border-rule pb-4">
            <h3 className="text-xl font-bold text-black flex items-center gap-2">
              {isEditing ? "Step 3: Review & Save Updates" : "Step 3: Final Review & Publish"}
            </h3>
            <p className="text-sm text-neutral-500 mt-1">
              {isEditing
                ? "Verify your changes. Once saved, students actively enrolled will receive an email notifying them of the updated curriculum."
                : "Review your course before making it live."}
            </p>
          </div>

          <div className="p-4 sm:p-6 rounded-xl bg-[#F7F2F6] border border-rule space-y-4">
            {/* Cover preview if set */}
            {coverImage && (
              <img
                src={coverImage}
                alt="Cover"
                className="w-full h-40 object-cover rounded-xl border border-rule mb-2"
              />
            )}

            <div>
              <div className="flex flex-wrap gap-2 mb-2 items-center">
                <span className="text-[11px] font-bold text-[#4A1A45] uppercase tracking-wider">{faculty}</span>
                <span className="text-[11px] font-bold text-neutral-400">·</span>
                <span className="text-[11px] font-bold text-black bg-[#E4D5E2] px-2 py-0.5 rounded-md">{department}</span>
                <span className="text-[11px] font-bold text-neutral-400">|</span>
                <span className="text-[11px] font-bold text-neutral-500">{level}</span>
                <span className="text-[11px] font-bold text-neutral-400">|</span>
                <span className="text-[11px] font-bold text-neutral-500">
                  {parseFloat(price) === 0 ? "Free" : formatNgn(parseFloat(price))}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-black">{title || "Untitled Course"}</h2>
              <p className="text-sm text-neutral-600 mt-2">{description || "No description provided."}</p>
            </div>

            <div className="border-t border-rule pt-4">
              <h4 className="font-bold text-black text-sm mb-3 uppercase tracking-wider">
                Curriculum ({modules.length} modules, {modules.reduce((a, m) => a + m.lessons.length, 0)} lessons)
              </h4>
              <div className="space-y-2">
                {modules.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-white border border-rule">
                    <h5 className="font-bold text-xs text-black">{m.title || `Module ${idx + 1}`}</h5>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {m.lessons.length} lessons
                      {" · "}{m.lessons.filter((l) => l.assignmentPrompt).length} assignments
                      {" · "}{m.lessons.filter((l) => l.videoUrl).length} with video
                      {" · "}{m.lessons.filter((l) => l.resourceUrl).length} with files
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {saveError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              {saveError}
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-[#F3EAF2] text-black font-bold text-sm border border-neutral-300 flex items-center gap-2">
              {isEditing
                ? "Course updated successfully! Enrolled students have been notified via email."
                : "Course published successfully. Redirecting..."}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 sm:px-6 py-3 rounded-xl bg-[#F3EAF2] border border-rule text-neutral-700 font-bold text-xs uppercase tracking-wider hover:bg-[#E4D5E2] transition-all"
            >
              Back
            </button>
            <button
              onClick={handleSaveCourse}
              disabled={saving || successMsg}
              className="px-5 sm:px-8 py-3.5 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
            >
              {saving
                ? (isEditing ? "Saving Updates..." : "Publishing...")
                : (isEditing ? "Save Changes & Notify Students" : "Publish Course")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LessonModuleBlock — extracted to keep main component readable
// ─────────────────────────────────────────────────────────────
function LessonModuleBlock({
  mod,
  mIdx,
  onModuleTitleChange,
  onAddLesson,
  onRemoveModule,
  onRemoveLesson,
  onUpdateLesson,
  onGenerateRubric,
  smallInputCls,
}: {
  mod: ModuleDraft;
  mIdx: number;
  onModuleTitleChange: (v: string) => void;
  onAddLesson: () => void;
  onRemoveModule?: () => void;
  onRemoveLesson: (li: number) => void;
  onUpdateLesson: (li: number, field: keyof LessonDraft, val: string) => void;
  onGenerateRubric: (li: number) => void;
  smallInputCls: string;
}) {
  return (
    <div className="p-4 sm:p-6 rounded-xl bg-[#F7F2F6] border border-rule space-y-4">
      {/* Module header */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder={`Module ${mIdx + 1} title`}
          value={mod.title}
          onChange={(e) => onModuleTitleChange(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg bg-white border border-rule text-sm font-bold text-black outline-none focus:border-[#4A1A45]"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={onAddLesson}
            className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-semibold text-black flex items-center gap-1 hover:border-black"
          >
            Add Lesson
          </button>
          {onRemoveModule && (
            <button
              onClick={onRemoveModule}
              className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all"
            >
              <PiTrash className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Lessons */}
      <div className="space-y-4 pl-4 border-l-2 border-rule">
        {mod.lessons.map((lesson, lIdx) => (
          <LessonRow
            key={lIdx}
            lesson={lesson}
            lIdx={lIdx}
            canRemove={mod.lessons.length > 1}
            onRemove={() => onRemoveLesson(lIdx)}
            onUpdate={(field, val) => onUpdateLesson(lIdx, field, val)}
            onGenerateRubric={() => onGenerateRubric(lIdx)}
            smallInputCls={smallInputCls}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LessonRow
// ─────────────────────────────────────────────────────────────
function LessonRow({
  lesson,
  lIdx,
  canRemove,
  onRemove,
  onUpdate,
  onGenerateRubric,
  smallInputCls,
}: {
  lesson: LessonDraft;
  lIdx: number;
  canRemove: boolean;
  onRemove: () => void;
  onUpdate: (field: keyof LessonDraft, val: string) => void;
  onGenerateRubric: () => void;
  smallInputCls: string;
}) {
  const resourceUpload = useFileUpload();
  const videoUpload    = useFileUpload();

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-white border border-rule space-y-4">
      {/* Lesson title row */}
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          placeholder={`Lesson ${lIdx + 1} title`}
          value={lesson.title}
          onChange={(e) => onUpdate("title", e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-lg bg-[#F7F2F6] border border-rule text-xs font-bold text-black outline-none focus:border-[#4A1A45]"
        />
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600"
          >
            <PiTrash className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Lesson content / notes */}
      <div>
        <label className="block text-[11px] font-bold text-neutral-600 mb-1 flex items-center gap-1">
          Lesson Notes / Text Content
        </label>
        <textarea
          rows={2}
          placeholder="Key reading points, summary, and context..."
          value={lesson.content}
          onChange={(e) => onUpdate("content", e.target.value)}
          className={smallInputCls}
        />
      </div>

      {/* Video — URL or file upload */}
      <div>
        <label className="block text-[11px] font-bold text-neutral-600 mb-1 flex items-center gap-1">
          Video
          <span className="text-neutral-400 font-normal normal-case">(YouTube embed, MP4 URL, or upload)</span>
        </label>
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="url"
            placeholder="https://www.youtube.com/embed/... or upload a video file"
            value={lesson.videoUrl}
            onChange={(e) => onUpdate("videoUrl", e.target.value)}
            className="w-full min-w-0 flex-1 px-3 py-2 rounded-lg bg-white border border-rule text-xs text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all"
          />
          <div className="shrink-0">
            <FilePickerButton
              accept="video/mp4,video/webm,video/ogg"
              uploading={videoUpload.uploading}
              label="Upload"
              onPicked={async (file) => {
                const result = await videoUpload.upload(file);
                if (result) onUpdate("videoUrl", result.url);
              }}
            />
          </div>
        </div>
        {videoUpload.error && <p className="text-[11px] text-red-600 mt-1">{videoUpload.error}</p>}
      </div>

      {/* Resource / file attachment */}
      <div>
        <label className="block text-[11px] font-bold text-neutral-600 mb-1 flex items-center gap-1">
          Resource File
          <span className="text-neutral-400 font-normal normal-case">(PDF, slides, zip, etc.)</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 min-w-0">
          <input
            type="text"
            placeholder="File name (e.g. Lecture Notes.pdf)"
            value={lesson.resourceName}
            onChange={(e) => onUpdate("resourceName", e.target.value)}
            className="sm:col-span-4 w-full min-w-0 px-3 py-2 rounded-lg bg-white border border-rule text-xs text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all"
          />
          <div className="sm:col-span-8 flex items-center gap-2 min-w-0">
            <input
              type="url"
              placeholder="URL or upload file"
              value={lesson.resourceUrl}
              onChange={(e) => onUpdate("resourceUrl", e.target.value)}
              className="w-full min-w-0 flex-1 px-3 py-2 rounded-lg bg-white border border-rule text-xs text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all"
            />
            <div className="shrink-0">
              <FilePickerButton
                accept="application/pdf,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                uploading={resourceUpload.uploading}
                label="Upload"
                onPicked={async (file) => {
                  const result = await resourceUpload.upload(file);
                  if (result) {
                    onUpdate("resourceUrl", result.url);
                    if (!lesson.resourceName) onUpdate("resourceName", result.name);
                  }
                }}
              />
            </div>
          </div>
        </div>
        {resourceUpload.error && <p className="text-[11px] text-red-600 mt-1">{resourceUpload.error}</p>}
        {/* Show existing file link */}
        {lesson.resourceUrl && lesson.resourceUrl.startsWith("storage:") ? (
          // Private upload: students receive a signed link in the course player
          <span className="text-[11px] text-[#4A1A45] font-bold mt-1 inline-block">
            {lesson.resourceName || "Uploaded file"} (uploaded)
          </span>
        ) : (
          isSafeRenderUrl(lesson.resourceUrl) && (
            <a
              href={lesson.resourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#4A1A45] font-bold hover:underline mt-1 inline-block"
            >
              {lesson.resourceName || lesson.resourceUrl}
            </a>
          )
        )}
      </div>

      {/* Assignment (optional) */}
      <div className="p-4 rounded-xl bg-[#F7F2F6] border border-rule space-y-3">
        <span className="text-[11px] font-bold text-[#4A1A45] flex items-center gap-1 uppercase tracking-wider">
          Assignment
          <span className="text-neutral-400 font-normal normal-case ml-1">(optional)</span>
        </span>
        <input
          type="text"
          placeholder="e.g. Explain the core concepts covered in this lesson..."
          value={lesson.assignmentPrompt}
          onChange={(e) => onUpdate("assignmentPrompt", e.target.value)}
          className={smallInputCls}
        />
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
              Model Answer / Grading Rubric
            </label>
            <button
              type="button"
              onClick={onGenerateRubric}
              disabled={!lesson.assignmentPrompt.trim()}
              className="text-[10px] px-2 py-0.5 rounded bg-[#4A1A45] text-white font-bold flex items-center gap-1 disabled:opacity-50"
            >
              Auto-Generate
            </button>
          </div>
          <textarea
            rows={2}
            placeholder="Benchmark answers and grading criteria for automated assessment..."
            value={lesson.assignmentReferenceAnswer}
            onChange={(e) => onUpdate("assignmentReferenceAnswer", e.target.value)}
            className={smallInputCls}
          />
        </div>
      </div>
    </div>
  );
}
