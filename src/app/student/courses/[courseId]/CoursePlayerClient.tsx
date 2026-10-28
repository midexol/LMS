"use client";

import { isSafeRenderUrl } from "@/lib/safeUrl";
import React, { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { PASS_MARK_PERCENT } from "@/lib/grading";
import { Badge } from "@/components/ui/Badge";
import { PiArrowsClockwise, PiBell, PiBookOpen, PiCaretDown, PiCaretLeft, PiCaretRight, PiCaretUp, PiChatCircle, PiCheck, PiCheckCircle, PiDownloadSimple, PiListBullets, PiLock, PiMedal, PiPaperPlaneTilt, PiPlayCircle, PiPrinter, PiWarningCircle, PiX } from "react-icons/pi";

interface CoursePlayerClientProps {
  course: any;
  enrollment: any;
  student: any;
}

export function CoursePlayerClient({ course, enrollment, student }: CoursePlayerClientProps) {
  const allLessons: any[] = [];
  course.modules.forEach((m: any) => {
    m.lessons.forEach((l: any) => {
      allLessons.push({ ...l, moduleTitle: m.title });
    });
  });

  const [activeLesson, setActiveLesson] = useState<any>(allLessons[0] || null);

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(
    allLessons.filter((l) => l.lessonProgress?.[0]?.completed).map((l) => l.id)
  );

  const [submissionText, setSubmissionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [gradeResult, setGradeResult] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [discussions, setDiscussions] = useState<any[]>(activeLesson?.discussionPosts || []);
  const [newPostContent, setNewPostContent] = useState("");
  const [replyTextMap, setReplyTextMap] = useState<{ [postId: string]: string }>({});

  const [completingCourse, setCompletingCourse] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(enrollment.status === "COMPLETED");
  const [showCertificate, setShowCertificate] = useState(false);
  const [mobileCurriculumOpen, setMobileCurriculumOpen] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsExpanded, setAnnouncementsExpanded] = useState(true);

  useEffect(() => {
    fetch(`/api/announcements?courseId=${course.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setAnnouncements(d.announcements); })
      .catch(() => {});
  }, [course.id]);

  const completionPercentage = Math.round(
    (completedLessonIds.length / Math.max(1, allLessons.length)) * 100
  );

  const currentLessonIndex = allLessons.findIndex((l) => l.id === activeLesson?.id);
  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  const selectLesson = (lesson: any) => {
    setActiveLesson(lesson);
    setDiscussions(lesson.discussionPosts || []);
    setIsResubmitting(false);
    setGradeResult(null);
    setSubmissionText("");
    setMobileCurriculumOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNextLesson = async () => {
    if (!nextLesson) return;
    const isCurrentDone = completedLessonIds.includes(activeLesson?.id);
    if (!isCurrentDone && activeLesson?.id) {
      await handleToggleLessonComplete(activeLesson.id);
    }
    selectLesson(nextLesson);
  };

  const currentAssignment = activeLesson?.assignments?.[0] || null;
  const previousSubmission = gradeResult || currentAssignment?.submissions?.[0] || null;

  const handleToggleLessonComplete = async (lessonId: string) => {
    const isAlreadyDone = completedLessonIds.includes(lessonId);
    const newCompleted = !isAlreadyDone;

    setCompletedLessonIds(
      newCompleted
        ? [...completedLessonIds, lessonId]
        : completedLessonIds.filter((id) => id !== lessonId)
    );

    try {
      await fetch("/api/student/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, completed: newCompleted }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!currentAssignment || !submissionText.trim()) return;
    setSubmitting(true);
    setGradeResult(null);
    setSubmitError(null);

    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: currentAssignment.id, content: submissionText }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGradeResult(data.submission);
        setIsResubmitting(false);
        if (!completedLessonIds.includes(activeLesson.id)) {
          handleToggleLessonComplete(activeLesson.id);
        }
      } else {
        // Never fail silently: rate limits, lost enrollment and server errors all need an explanation
        setSubmitError(data.error || "Your answer could not be submitted. Please try again.");
      }
    } catch (e) {
      console.error(e);
      setSubmitError("Could not reach the server. Check your connection and try again; your answer has been kept.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteCourse = async () => {
    setCompletingCourse(true);
    setCompletionError(null);

    try {
      const res = await fetch("/api/courses/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not complete course.");
      setIsCompleted(true);
    } catch (e: any) {
      setCompletionError(e.message);
    } finally {
      setCompletingCourse(false);
    }
  };

  const handleCreateDiscussionPost = async () => {
    if (!newPostContent.trim() || !activeLesson) return;
    try {
      const res = await fetch("/api/student/discussion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_post", lessonId: activeLesson.id, content: newPostContent }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscussions([data.post, ...discussions]);
        setNewPostContent("");
      }
    } catch (e) { console.error(e); }
  };

  const handleCreateDiscussionReply = async (postId: string) => {
    const text = replyTextMap[postId];
    if (!text?.trim()) return;
    try {
      const res = await fetch("/api/student/discussion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_reply", postId, content: text }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscussions(
          discussions.map((p) =>
            p.id === postId ? { ...p, replies: [...(p.replies || []), data.reply] } : p
          )
        );
        setReplyTextMap({ ...replyTextMap, [postId]: "" });
      }
    } catch (e) { console.error(e); }
  };

  return (
    <main className="max-w-7xl mx-auto px-5 sm:px-6 space-y-5 sm:space-y-6 pb-28 lg:pb-8">
      {/* Course Top Header */}
      <div className="p-5 sm:p-6 rounded-lg bg-white shadow-[6px_6px_20px_#e2e8f0,-6px_-6px_20px_#ffffff] border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge type={isCompleted ? "COMPLETED" : "ACTIVE"} />
              <span className="text-xs font-bold text-slate-500 normal-case sm:uppercase">{course.category}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
          </div>

          {!isCompleted ? (
            <button
              onClick={handleCompleteCourse}
              disabled={completingCourse}
              className="px-5 sm:px-6 py-3 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs flex items-center gap-2 transition-all"
            >
              <PiCheckCircle className="w-4 h-4" />
              {completingCourse ? "Checking Criteria..." : "Complete Course & Release Lock"}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2.5 rounded-xl bg-[#F3EAF2] border border-neutral-300 text-black text-xs font-bold flex items-center gap-2">
                <PiCheck className="w-4 h-4 text-black" />
                Course Completed
              </div>
              <button
                onClick={() => setShowCertificate(true)}
                className="px-4 py-2.5 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] text-white text-xs font-bold flex items-center gap-2 transition-all"
              >
                <PiMedal className="w-4 h-4 text-[#D6BDD4]" />
                Certificate
              </button>
            </div>
          )}
        </div>

        {completionError && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2">
            <PiWarningCircle className="w-5 h-5 shrink-0 text-amber-700" />
            <span>{completionError}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="p-4 rounded-xl bg-[#F7F2F6] border border-rule space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-neutral-700">
            <span>Overall Course Progress</span>
            <span className="text-[#4A1A45] font-bold">
              {completionPercentage}% ({completedLessonIds.length}/{allLessons.length} lessons)
            </span>
          </div>
          <div className="w-full bg-[#E4D5E2] h-2.5 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-[#4A1A45] h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="p-5 rounded-lg bg-white border border-rule">
          <button
            onClick={() => setAnnouncementsExpanded(!announcementsExpanded)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-base font-bold text-black flex items-center gap-2">
              <PiBell className="w-4 h-4 text-[#4A1A45]" />
              Course Announcements
              <span className="px-2 py-0.5 rounded-md bg-[#4A1A45]/10 text-[#4A1A45] text-xs sm:text-[10px] font-bold">
                {announcements.length}
              </span>
            </h3>
            {announcementsExpanded ? (
              <PiCaretUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <PiCaretDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {announcementsExpanded && (
            <div className="mt-4 space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="p-4 rounded-xl bg-[#F7F2F6] border border-rule">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-black text-sm">{a.title}</h4>
                    <span className="text-xs sm:text-[10px] text-neutral-400 font-semibold">
                      {formatDate(a.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed">{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile Syllabus Quick Header Bar */}
      <div className="lg:hidden flex items-center justify-between p-3.5 rounded-xl bg-white border border-rule">
        <button
          onClick={() => setMobileCurriculumOpen(true)}
          className="flex items-center gap-2 text-xs font-bold text-black hover:text-[#4A1A45] transition-colors"
        >
          <PiListBullets className="w-4 h-4 text-[#4A1A45]" />
          <span>Curriculum Syllabus ({completedLessonIds.length}/{allLessons.length})</span>
        </button>
        <span className="text-xs sm:text-[11px] font-semibold text-neutral-500">
          Lesson {currentLessonIndex >= 0 ? currentLessonIndex + 1 : 1} of {allLessons.length}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Sidebar Navigator (Desktop) */}
        <div className="hidden lg:block lg:col-span-1 p-5 sm:p-6 rounded-lg bg-white border border-rule space-y-4 h-fit sticky top-24">
          <h3 className="font-bold text-black text-base flex items-center gap-2 border-b border-rule pb-3">
            <PiBookOpen className="w-5 h-5 text-[#4A1A45]" />
            Curriculum Navigator
          </h3>

          <div className="space-y-4">
            {course.modules.map((moduleItem: any) => (
              <div key={moduleItem.id} className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-700 normal-case sm:uppercase tracking-normal sm:tracking-wider">
                  {moduleItem.title}
                </h4>
                <div className="space-y-2 pl-2 border-l-2 border-rule">
                  {moduleItem.lessons.map((lesson: any) => {
                    const isDone = completedLessonIds.includes(lesson.id);
                    const isSelected = activeLesson?.id === lesson.id;
                    const globalIdx = allLessons.findIndex((al: any) => al.id === lesson.id);
                    const isLocked =
                      globalIdx > 0 && !completedLessonIds.includes(allLessons[globalIdx - 1].id);

                    return (
                      <button
                        key={lesson.id}
                        disabled={isLocked}
                        onClick={() => selectLesson(lesson)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-between border ${
                          isLocked
                            ? "opacity-50 cursor-not-allowed bg-[#F3EAF2] border-rule text-neutral-400"
                            : isSelected
                            ? "bg-[#4A1A45] text-white border-[#4A1A45] "
                            : "bg-white border-rule text-neutral-800 hover:border-neutral-400 hover:bg-[#F7F2F6]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isLocked ? (
                            <PiLock className="w-4 h-4 text-neutral-400 shrink-0" />
                          ) : isDone ? (
                            <PiCheckCircle className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-[#4A1A45]"}`} />
                          ) : (
                            <PiPlayCircle className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-[#4A1A45]"}`} />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-6">
          {activeLesson ? (
            <>
              {/* Lesson Card */}
              <div className="p-6 sm:p-8 rounded-lg bg-white border border-rule space-y-4">
                <div className="flex justify-between items-center border-b border-rule pb-3">
                  <h2 className="text-xl font-bold text-black">{activeLesson.title}</h2>
                  <button
                    onClick={() => handleToggleLessonComplete(activeLesson.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                      completedLessonIds.includes(activeLesson.id)
                        ? "bg-[#4A1A45] border-[#4A1A45] text-white "
                        : "bg-white border-neutral-300 text-black hover:bg-[#F7F2F6] "
                    }`}
                  >
                    <PiCheckCircle className="w-4 h-4" />
                    {completedLessonIds.includes(activeLesson.id)
                      ? "Lesson Completed"
                      : "Mark as Completed"}
                  </button>
                </div>

                {/* Video */}
                {isSafeRenderUrl(activeLesson.videoUrl) && (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-[#4A1A45] flex items-center justify-center">
                    {activeLesson.videoUrl.startsWith("/uploads/") ||
                    /\.(mp4|webm|ogg|ogv)(\?.*)?$/i.test(activeLesson.videoUrl) ? (
                      <video
                        controls
                        controlsList="nodownload"
                        src={activeLesson.videoUrl}
                        className="w-full h-full object-contain"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <iframe
                        src={activeLesson.videoUrl}
                        className="w-full h-full"
                        allowFullScreen
                        title={activeLesson.title}
                      />
                    )}
                  </div>
                )}

                {/* Lesson Content */}
                <div className="p-5 sm:p-6 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs normal-case sm:uppercase tracking-normal sm:tracking-wider">
                    Lesson Materials
                  </h4>
                  <div className="whitespace-pre-wrap">
                    {activeLesson.content || "Read materials and complete the assignment below."}
                  </div>
                </div>

                {/* Resource Attachment */}
                {activeLesson.resourceName && isSafeRenderUrl(activeLesson.resourceUrl) && (
                  <a
                    href={activeLesson.resourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl bg-white border border-rule hover:border-black hover:bg-[#F7F2F6] transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-[#F3EAF2] border border-rule group-hover:bg-[#E4D5E2] transition-all">
                      <PiDownloadSimple className="w-4 h-4 text-[#4A1A45]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-black">{activeLesson.resourceName}</p>
                      <p className="text-xs sm:text-[10px] text-neutral-400">Downloadable Resource</p>
                    </div>
                  </a>
                )}
              </div>

              {/* Assignment & Automated Assessment */}
              {currentAssignment && (
                <div className="p-6 sm:p-8 rounded-lg bg-white border border-rule space-y-5 sm:space-y-6">
                  <div className="border-b border-rule pb-3 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-[#4A1A45] normal-case sm:uppercase tracking-normal sm:tracking-wider">
                        Lesson Assignment
                      </span>
                      <h3 className="text-lg font-bold text-black">{currentAssignment.title}</h3>
                    </div>
                    <span className="px-3 py-1 rounded-md text-xs font-bold text-black bg-[#F3EAF2] border border-rule">
                      Max Score: {currentAssignment.maxScore}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#F7F2F6] border border-rule text-sm text-neutral-800 font-medium">
                    <p>
                      <strong>Prompt:</strong> {currentAssignment.prompt}
                    </p>
                  </div>

                  {previousSubmission && !isResubmitting ? (
                    <div className="p-5 sm:p-6 rounded-xl bg-[#F7F2F6] border border-rule space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-black text-sm flex items-center gap-2">
                          <PiMedal className="w-5 h-5 text-[#4A1A45]" />
                          Evaluation Details
                        </h4>
                        <div className="flex items-center gap-3">
                          <Badge
                            type="GRADED"
                            text={`Score: ${previousSubmission.score} / ${currentAssignment.maxScore}`}
                          />
                          <button
                            onClick={() => {
                              setSubmissionText(previousSubmission.content);
                              setIsResubmitting(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-bold text-black flex items-center gap-1 hover:bg-[#F3EAF2]"
                          >
                            <PiArrowsClockwise className="w-3.5 h-3.5" /> Revise Answer
                          </button>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-white border border-rule">
                        <h5 className="text-xs font-bold text-neutral-600 mb-1 normal-case sm:uppercase tracking-normal sm:tracking-wider">Your Submission:</h5>
                        <p className="text-xs text-neutral-800 whitespace-pre-wrap">
                          {previousSubmission.content}
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-white border border-rule space-y-2">
                        <h5 className="text-xs font-bold text-[#4A1A45] normal-case sm:uppercase tracking-normal sm:tracking-wider">Evaluation Feedback:</h5>
                        <p className="text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed">
                          {previousSubmission.aiFeedback}
                        </p>
                      </div>

                      {previousSubmission.tutorFeedback && (
                        <div className="p-4 rounded-lg bg-[#F3EAF2] border border-neutral-300 space-y-1">
                          <h5 className="text-xs font-bold text-black normal-case sm:uppercase tracking-normal sm:tracking-wider">Tutor Custom Review Note:</h5>
                          <p className="text-xs text-neutral-800 leading-relaxed">
                            {previousSubmission.tutorFeedback}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-2 normal-case sm:uppercase tracking-normal sm:tracking-wider">
                          {isResubmitting ? "Revise Your Answer" : "Your Answer"}
                        </label>
                        <textarea
                          rows={6}
                          placeholder="Type your answer here..."
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-[#F7F2F6] border border-rule text-sm text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleSubmitAssignment}
                          disabled={submitting || !submissionText.trim()}
                          className="px-5 sm:px-6 py-3 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] disabled:opacity-60 text-white font-bold text-sm flex items-center gap-2 transition-all"
                        >
                          <PiPaperPlaneTilt className="w-4 h-4" />
                          {submitting
                            ? "Evaluating Submission..."
                            : isResubmitting
                            ? "Submit Revised Answer"
                            : "Submit Assignment"}
                        </button>
                        {submitError && (
                          <p role="alert" className="text-xs font-semibold text-red-700">{submitError}</p>
                        )}
                        {isResubmitting && (
                          <button
                            onClick={() => { setIsResubmitting(false); setSubmissionText(""); }}
                            className="px-4 py-3 rounded-xl bg-[#F3EAF2] border border-neutral-300 text-neutral-800 text-xs font-bold hover:bg-[#E4D5E2]"
                          >
                            Cancel Revision
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Discussion Forum */}
              <div className="p-6 sm:p-8 rounded-lg bg-white border border-rule space-y-5 sm:space-y-6">
                <h3 className="text-lg font-bold text-black flex items-center gap-2 border-b border-rule pb-3">
                  <PiChatCircle className="w-5 h-5 text-[#4A1A45]" />
                  Lesson Discussion &amp; Q&A Forum
                </h3>

                <div className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Ask a question or share a thought about this lesson..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#F7F2F6] border border-rule text-xs text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all"
                  />
                  <button
                    onClick={handleCreateDiscussionPost}
                    disabled={!newPostContent.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] disabled:opacity-60 text-white font-bold text-xs normal-case sm:uppercase tracking-normal sm:tracking-wider flex items-center gap-2 transition-all"
                  >
                    <PiPaperPlaneTilt className="w-3.5 h-3.5" /> Post Question
                  </button>
                </div>

                <div className="space-y-4 pt-4 border-t border-rule">
                  {discussions.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center italic py-4">
                      No discussion posts yet. Be the first to ask a question.
                    </p>
                  ) : (
                    discussions.map((post) => (
                      <div
                        key={post.id}
                        className="p-4 rounded-xl bg-[#F7F2F6] border border-rule space-y-3"
                      >
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-black font-bold">{post.user?.name || "Student"}</span>
                          <span className="text-neutral-400 text-xs sm:text-[10px]">
                            {formatDate(post.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-700 leading-relaxed">{post.content}</p>

                        {post.replies && post.replies.length > 0 && (
                          <div className="pl-4 space-y-2 border-l-2 border-neutral-300 pt-2">
                            {post.replies.map((reply: any) => (
                              <div
                                key={reply.id}
                                className="p-2.5 rounded-lg bg-white border border-rule space-y-1"
                              >
                                <div className="flex justify-between text-xs sm:text-[11px] font-bold">
                                  <span className="text-black">{reply.user?.name || "User"}</span>
                                  <span className="text-neutral-400 text-[9px]">
                                    {formatDate(reply.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-700">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Write a reply..."
                            value={replyTextMap[post.id] || ""}
                            onChange={(e) =>
                              setReplyTextMap({ ...replyTextMap, [post.id]: e.target.value })
                            }
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleCreateDiscussionReply(post.id)
                            }
                            className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-rule text-xs text-black outline-none focus:border-[#4A1A45]"
                          />
                          <button
                            onClick={() => handleCreateDiscussionReply(post.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#4A1A45] text-white font-bold text-xs hover:bg-[#3B1537]"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-neutral-500">
              Select a lesson from the navigator to begin learning.
            </div>
          )}
        </div>
      </div>

      {/* ──────────────── OFFICIAL COMPLETION CERTIFICATE MODAL ──────────────── */}
      {showCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 print:p-0 print:bg-white">
          <div className="relative w-full max-w-3xl bg-white rounded-lg border border-neutral-300 overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none">
            {/* Modal Controls (Hidden in print) */}
            <div className="flex items-center justify-between p-4 bg-[#1E0A1C] text-white print:hidden">
              <div className="flex items-center gap-2 text-xs font-bold">
                <PiMedal className="w-4 h-4 text-[#D6BDD4]" />
                Certificate of Completion
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-white text-[#4A1A45] hover:bg-[#F7F2F6] text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <PiPrinter className="w-3.5 h-3.5" /> Print / Save as PDF
                </button>
                <button
                  onClick={() => setShowCertificate(false)}
                  className="p-1.5 rounded-xl bg-[#3B1537] hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all"
                >
                  <PiX className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Certificate Canvas */}
            <div className="p-10 sm:p-14 text-center bg-white border-8 border-double border-neutral-900 m-4 rounded-lg relative">
              <div className="space-y-5 sm:space-y-6">
                <div>
                  <span className="text-xs sm:text-[11px] font-bold normal-case sm:uppercase tracking-[0.3em] text-[#4A1A45] block mb-1">
                    Academia LMS
                  </span>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold text-black tracking-tight">
                    Certificate of Completion
                  </h2>
                </div>

                <p className="text-xs text-neutral-500 normal-case sm:uppercase tracking-normal sm:tracking-widest font-semibold">
                  This certifies that
                </p>

                <div className="py-2 border-b-2 border-[#4A1A45] inline-block px-10">
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-black">
                    {student.name}
                  </h3>
                </div>

                <p className="text-xs text-neutral-600 max-w-lg mx-auto leading-relaxed">
                  has completed all lessons and assignments, with an average score of at least {PASS_MARK_PERCENT}%, in the course
                </p>

                <div className="space-y-1">
                  <h4 className="font-bold text-xl sm:text-2xl text-black">
                    {course.title}
                  </h4>
                  <p className="text-xs font-bold text-[#4A1A45] normal-case sm:uppercase tracking-normal sm:tracking-wider">
                    {course.faculty || course.category} · {course.department || student.department || "Academic Department"}
                  </p>
                </div>

                <div className="pt-8 border-t border-rule grid grid-cols-2 items-end text-left text-xs gap-4">
                  <div>
                    <span className="text-xs sm:text-[10px] text-neutral-400 font-bold normal-case sm:uppercase tracking-normal sm:tracking-wider block">Award Date</span>
                    <span className="font-bold text-black">{formatDate(enrollment.completedAt || new Date().toISOString())}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs sm:text-[10px] text-neutral-400 font-bold normal-case sm:uppercase tracking-normal sm:tracking-wider block">Certificate ID</span>
                    <span className="font-mono text-xs font-bold text-neutral-800">
                      CERT-{enrollment.id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── STICKY MOBILE BOTTOM NAVIGATION BAR ──────────────── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 border-t border-rule px-3 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* Previous Lesson */}
          <button
            onClick={() => prevLesson && selectLesson(prevLesson)}
            disabled={!prevLesson}
            className="px-3 py-2.5 rounded-xl border border-rule bg-white text-xs font-bold text-black flex items-center gap-1.5 transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:pointer-events-none hover:bg-[#F7F2F6] shadow-xs"
            title="Previous Lesson"
          >
            <PiCaretLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Curriculum / Syllabus Drawer Toggle */}
          <button
            onClick={() => setMobileCurriculumOpen(true)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#F3EAF2] hover:bg-[#E4D5E2]/80 border border-rule text-xs font-bold text-black flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 shadow-xs"
          >
            <PiListBullets className="w-4 h-4 text-[#4A1A45]" />
            <span className="truncate">
              Syllabus ({completedLessonIds.length}/{allLessons.length})
            </span>
          </button>

          {/* Next / Complete & Next / Certificate */}
          {nextLesson ? (
            <button
              onClick={handleNextLesson}
              className="px-3.5 py-2.5 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] text-white text-xs font-bold flex items-center gap-1.5 transition-all duration-150 active:scale-95"
              title="Next Lesson"
            >
              <span>{completedLessonIds.includes(activeLesson?.id) ? "Next" : "Next"}</span>
              <PiCaretRight className="w-4 h-4" />
            </button>
          ) : !isCompleted ? (
            <button
              onClick={handleCompleteCourse}
              disabled={completingCourse}
              className="px-3.5 py-2.5 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] text-white text-xs font-bold flex items-center gap-1.5 transition-all duration-150 active:scale-95"
            >
              <PiCheckCircle className="w-4 h-4" />
              <span>Finish</span>
            </button>
          ) : (
            <button
              onClick={() => setShowCertificate(true)}
              className="px-3.5 py-2.5 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] text-white text-xs font-bold flex items-center gap-1.5 transition-all duration-150 active:scale-95"
            >
              <PiMedal className="w-4 h-4 text-[#D6BDD4]" />
              <span>Cert</span>
            </button>
          )}
        </div>
      </div>

      {/* ──────────────── MOBILE CURRICULUM BOTTOM SHEET DRAWER ──────────────── */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          mobileCurriculumOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop overlay */}
        <div
          onClick={() => setMobileCurriculumOpen(false)}
          className="absolute inset-0 bg-black/60-xs transition-opacity duration-300"
        />

        {/* Bottom sheet dialog */}
        <div
          className={`absolute inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-3xl border-t border-rule  flex flex-col transform transition-transform duration-300 ease-out ${
            mobileCurriculumOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {/* Sheet Drag Handle */}
          <div className="pt-3 pb-1 flex justify-center">
            <div className="w-12 h-1.5 rounded-full bg-neutral-300" />
          </div>

          {/* Sheet Header */}
          <div className="px-5 sm:px-6 py-3 border-b border-rule flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-black flex items-center gap-2">
                <PiBookOpen className="w-4 h-4 text-[#4A1A45]" />
                Course Curriculum
              </h3>
              <p className="text-xs sm:text-[11px] text-neutral-500 font-semibold mt-0.5">
                {completedLessonIds.length} of {allLessons.length} lessons completed ({completionPercentage}%)
              </p>
            </div>
            <button
              onClick={() => setMobileCurriculumOpen(false)}
              className="p-2 rounded-xl bg-[#F3EAF2] hover:bg-[#E4D5E2] text-neutral-600 transition-all active:scale-95"
              aria-label="Close Curriculum Drawer"
            >
              <PiX className="w-4 h-4" />
            </button>
          </div>

          {/* Sheet Body: Scrollable Modules & Lessons */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {course.modules.map((moduleItem: any) => (
              <div key={moduleItem.id} className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-700 normal-case sm:uppercase tracking-normal sm:tracking-wider">
                  {moduleItem.title}
                </h4>
                <div className="space-y-2 pl-2 border-l-2 border-rule">
                  {moduleItem.lessons.map((lesson: any) => {
                    const isDone = completedLessonIds.includes(lesson.id);
                    const isSelected = activeLesson?.id === lesson.id;
                    const globalIdx = allLessons.findIndex((al: any) => al.id === lesson.id);
                    const isLocked =
                      globalIdx > 0 && !completedLessonIds.includes(allLessons[globalIdx - 1].id);

                    return (
                      <button
                        key={lesson.id}
                        disabled={isLocked}
                        onClick={() => selectLesson(lesson)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-between border active:scale-98 ${
                          isLocked
                            ? "opacity-50 cursor-not-allowed bg-[#F3EAF2] border-rule text-neutral-400"
                            : isSelected
                            ? "bg-[#4A1A45] text-white border-[#4A1A45] "
                            : "bg-white border-rule text-neutral-800 hover:border-neutral-400 hover:bg-[#F7F2F6]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isLocked ? (
                            <PiLock className="w-4 h-4 text-neutral-400 shrink-0" />
                          ) : isDone ? (
                            <PiCheckCircle className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-[#4A1A45]"}`} />
                          ) : (
                            <PiPlayCircle className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-[#4A1A45]"}`} />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
