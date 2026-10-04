"use client";

import React, { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import {
  FiPlayCircle,
  FiCheckCircle,
  FiSend,
  FiAward,
  FiBookOpen,
  FiLock,
  FiCheck,
  FiMessageSquare,
  FiRefreshCw,
  FiAlertCircle,
  FiDownload,
  FiBell,
  FiChevronDown,
  FiChevronUp,
  FiPrinter,
  FiX,
} from "react-icons/fi";

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

  const [discussions, setDiscussions] = useState<any[]>(activeLesson?.discussionPosts || []);
  const [newPostContent, setNewPostContent] = useState("");
  const [replyTextMap, setReplyTextMap] = useState<{ [postId: string]: string }>({});

  const [completingCourse, setCompletingCourse] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(enrollment.status === "COMPLETED");
  const [showCertificate, setShowCertificate] = useState(false);

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
      }
    } catch (e) {
      console.error(e);
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
    <main className="max-w-7xl mx-auto px-6 space-y-6">
      {/* Course Top Header */}
      <div className="p-6 rounded-2xl bg-white shadow-[6px_6px_20px_#e2e8f0,-6px_-6px_20px_#ffffff] border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge type={isCompleted ? "COMPLETED" : "ACTIVE"} />
              <span className="text-xs font-bold text-slate-500 uppercase">{course.category}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
          </div>

          {!isCompleted ? (
            <button
              onClick={handleCompleteCourse}
              disabled={completingCourse}
              className="px-6 py-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <FiCheckCircle className="w-4 h-4" />
              {completingCourse ? "Checking Criteria..." : "Complete Course & Release Lock"}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2.5 rounded-xl bg-neutral-100 border border-neutral-300 text-black text-xs font-bold flex items-center gap-2 shadow-sm">
                <FiCheck className="w-4 h-4 text-black" />
                Course Completed
              </div>
              <button
                onClick={() => setShowCertificate(true)}
                className="px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <FiAward className="w-4 h-4 text-[#D4A373]" />
                Official Certificate
              </button>
            </div>
          )}
        </div>

        {completionError && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2 shadow-sm">
            <FiAlertCircle className="w-5 h-5 shrink-0 text-amber-700" />
            <span>{completionError}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-neutral-700">
            <span>Overall Course Progress</span>
            <span className="text-[#784D28] font-bold">
              {completionPercentage}% ({completedLessonIds.length}/{allLessons.length} lessons)
            </span>
          </div>
          <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-black h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm">
          <button
            onClick={() => setAnnouncementsExpanded(!announcementsExpanded)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-base font-bold text-black flex items-center gap-2">
              <FiBell className="w-4 h-4 text-[#784D28]" />
              Course Announcements
              <span className="px-2 py-0.5 rounded-full bg-[#784D28]/10 text-[#784D28] text-[10px] font-bold">
                {announcements.length}
              </span>
            </h3>
            {announcementsExpanded ? (
              <FiChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <FiChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {announcementsExpanded && (
            <div className="mt-4 space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-black text-sm">{a.title}</h4>
                    <span className="text-[10px] text-neutral-400 font-semibold">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Sidebar Navigator */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-white border border-neutral-200 space-y-4 h-fit shadow-sm">
          <h3 className="font-bold text-black text-base flex items-center gap-2 border-b border-neutral-200 pb-3">
            <FiBookOpen className="w-5 h-5 text-[#784D28]" />
            Curriculum Navigator
          </h3>

          <div className="space-y-4">
            {course.modules.map((moduleItem: any) => (
              <div key={moduleItem.id} className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  {moduleItem.title}
                </h4>
                <div className="space-y-2 pl-2 border-l-2 border-neutral-200">
                  {moduleItem.lessons.map((lesson: any) => {
                    const isDone = completedLessonIds.includes(lesson.id);
                    const isSelected = activeLesson?.id === lesson.id;
                    const globalIdx = allLessons.findIndex((al) => al.id === lesson.id);
                    const isLocked =
                      globalIdx > 0 && !completedLessonIds.includes(allLessons[globalIdx - 1].id);

                    return (
                      <button
                        key={lesson.id}
                        disabled={isLocked}
                        onClick={() => {
                          if (!isLocked) {
                            setActiveLesson(lesson);
                            setDiscussions(lesson.discussionPosts || []);
                            setIsResubmitting(false);
                            setGradeResult(null);
                            setSubmissionText("");
                          }
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between border ${
                          isLocked
                            ? "opacity-50 cursor-not-allowed bg-neutral-100 border-neutral-200 text-neutral-400"
                            : isSelected
                            ? "bg-black text-white border-black shadow-sm"
                            : "bg-white border-neutral-200 text-neutral-800 hover:border-neutral-400"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isLocked ? (
                            <FiLock className="w-4 h-4 text-neutral-400 shrink-0" />
                          ) : isDone ? (
                            <FiCheckCircle className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-black"}`} />
                          ) : (
                            <FiPlayCircle className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-[#784D28]"}`} />
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
        <div className="lg:col-span-2 space-y-6">
          {activeLesson ? (
            <>
              {/* Lesson Card */}
              <div className="p-8 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                  <h2 className="text-xl font-bold text-black">{activeLesson.title}</h2>
                  <button
                    onClick={() => handleToggleLessonComplete(activeLesson.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                      completedLessonIds.includes(activeLesson.id)
                        ? "bg-black border-black text-white shadow-sm"
                        : "bg-white border-neutral-300 text-black hover:bg-neutral-50 shadow-sm"
                    }`}
                  >
                    <FiCheckCircle className="w-4 h-4" />
                    {completedLessonIds.includes(activeLesson.id)
                      ? "Lesson Completed"
                      : "Mark as Completed"}
                  </button>
                </div>

                {/* Video */}
                {activeLesson.videoUrl && (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-sm flex items-center justify-center">
                    {activeLesson.videoUrl.startsWith("/uploads/") ||
                    /\.(mp4|webm|ogg)(\?.*)?$/i.test(activeLesson.videoUrl) ? (
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
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Lesson Materials
                  </h4>
                  <div className="whitespace-pre-wrap">
                    {activeLesson.content || "Read materials and complete the assignment below."}
                  </div>
                </div>

                {/* Resource Attachment */}
                {activeLesson.resourceName && activeLesson.resourceUrl && (
                  <a
                    href={activeLesson.resourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl bg-white border border-neutral-200 hover:border-black hover:bg-neutral-50 transition-all shadow-sm group"
                  >
                    <div className="p-2 rounded-lg bg-neutral-100 border border-neutral-200 group-hover:bg-neutral-200 transition-all">
                      <FiDownload className="w-4 h-4 text-[#784D28]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-black">{activeLesson.resourceName}</p>
                      <p className="text-[10px] text-neutral-400">Downloadable Resource</p>
                    </div>
                  </a>
                )}
              </div>

              {/* Assignment & AI Auto-Grading */}
              {currentAssignment && (
                <div className="p-8 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-6">
                  <div className="border-b border-neutral-200 pb-3 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-[#784D28] uppercase tracking-wider">
                        Lesson Assignment
                      </span>
                      <h3 className="text-lg font-bold text-black">{currentAssignment.title}</h3>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold text-black bg-neutral-100 border border-neutral-200">
                      Max Score: {currentAssignment.maxScore}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-800 font-medium">
                    <p>
                      <strong>Prompt:</strong> {currentAssignment.prompt}
                    </p>
                  </div>

                  {previousSubmission && !isResubmitting ? (
                    <div className="p-6 rounded-xl bg-neutral-50 border border-neutral-200 space-y-4 shadow-sm">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-black text-sm flex items-center gap-2">
                          <FiAward className="w-5 h-5 text-[#784D28]" />
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
                            className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 shadow-sm text-xs font-bold text-black flex items-center gap-1 hover:bg-neutral-100"
                          >
                            <FiRefreshCw className="w-3.5 h-3.5" /> Revise Answer
                          </button>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-white border border-neutral-200">
                        <h5 className="text-xs font-bold text-neutral-600 mb-1 uppercase tracking-wider">Your Submission:</h5>
                        <p className="text-xs text-neutral-800 whitespace-pre-wrap">
                          {previousSubmission.content}
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-white border border-neutral-200 space-y-2">
                        <h5 className="text-xs font-bold text-[#784D28] uppercase tracking-wider">AI Tutor Feedback:</h5>
                        <p className="text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed">
                          {previousSubmission.aiFeedback}
                        </p>
                      </div>

                      {previousSubmission.tutorFeedback && (
                        <div className="p-4 rounded-lg bg-neutral-100 border border-neutral-300 space-y-1">
                          <h5 className="text-xs font-bold text-black uppercase tracking-wider">Tutor Custom Review Note:</h5>
                          <p className="text-xs text-neutral-800 leading-relaxed">
                            {previousSubmission.tutorFeedback}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-2 uppercase tracking-wider">
                          {isResubmitting ? "Revise Your Answer" : "Your Answer"}
                        </label>
                        <textarea
                          rows={6}
                          placeholder="Type your answer here..."
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleSubmitAssignment}
                          disabled={submitting || !submissionText.trim()}
                          className="px-6 py-3 rounded-xl bg-black hover:bg-neutral-800 disabled:opacity-60 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
                        >
                          <FiSend className="w-4 h-4" />
                          {submitting
                            ? "Evaluating with AI..."
                            : isResubmitting
                            ? "Submit Revised Answer"
                            : "Submit Assignment"}
                        </button>
                        {isResubmitting && (
                          <button
                            onClick={() => { setIsResubmitting(false); setSubmissionText(""); }}
                            className="px-4 py-3 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-bold hover:bg-neutral-200"
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
              <div className="p-8 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-black flex items-center gap-2 border-b border-neutral-200 pb-3">
                  <FiMessageSquare className="w-5 h-5 text-[#784D28]" />
                  Lesson Discussion &amp; Q&A Forum
                </h3>

                <div className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Ask a question or share a thought about this lesson..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                  <button
                    onClick={handleCreateDiscussionPost}
                    disabled={!newPostContent.trim()}
                    className="px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                  >
                    <FiSend className="w-3.5 h-3.5" /> Post Question
                  </button>
                </div>

                <div className="space-y-4 pt-4 border-t border-neutral-200">
                  {discussions.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center italic py-4">
                      No discussion posts yet. Be the first to ask a question.
                    </p>
                  ) : (
                    discussions.map((post) => (
                      <div
                        key={post.id}
                        className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3"
                      >
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-black font-bold">{post.user?.name || "Student"}</span>
                          <span className="text-neutral-400 text-[10px]">
                            {formatDate(post.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-700 leading-relaxed">{post.content}</p>

                        {post.replies && post.replies.length > 0 && (
                          <div className="pl-4 space-y-2 border-l-2 border-neutral-300 pt-2">
                            {post.replies.map((reply: any) => (
                              <div
                                key={reply.id}
                                className="p-2.5 rounded-lg bg-white border border-neutral-200 space-y-1 shadow-sm"
                              >
                                <div className="flex justify-between text-[11px] font-bold">
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
                            className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs text-black outline-none focus:border-black"
                          />
                          <button
                            onClick={() => handleCreateDiscussionReply(post.id)}
                            className="px-3 py-1.5 rounded-lg bg-black text-white font-bold text-xs shadow-sm hover:bg-neutral-800"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:p-0 print:bg-white">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-neutral-300 overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none">
            {/* Modal Controls (Hidden in print) */}
            <div className="flex items-center justify-between p-4 bg-neutral-950 text-white print:hidden">
              <div className="flex items-center gap-2 text-xs font-bold">
                <FiAward className="w-4 h-4 text-[#D4A373]" />
                Official Academic Certificate of Completion
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-white text-black hover:bg-neutral-100 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <FiPrinter className="w-3.5 h-3.5" /> Print / Save as PDF
                </button>
                <button
                  onClick={() => setShowCertificate(false)}
                  className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Certificate Canvas */}
            <div className="p-10 sm:p-14 text-center bg-white border-8 border-double border-neutral-900 m-4 rounded-2xl relative">
              <div className="space-y-6">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#784D28] block mb-1">
                    Polytechnic Academic Directorate &amp; Examination Board
                  </span>
                  <h2 className="font-serif text-3xl sm:text-4xl font-black text-black tracking-tight">
                    Certificate of Completion
                  </h2>
                </div>

                <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">
                  This is officially awarded to certify that
                </p>

                <div className="py-2 border-b-2 border-black inline-block px-10">
                  <h3 className="font-serif text-2xl sm:text-3xl font-black text-black">
                    {student.name}
                  </h3>
                </div>

                <p className="text-xs text-neutral-600 max-w-lg mx-auto leading-relaxed">
                  has successfully satisfied all prescribed academic requirements, lecture modules, and evaluated assignments with verified competence in
                </p>

                <div className="space-y-1">
                  <h4 className="font-black text-xl sm:text-2xl text-black">
                    {course.title}
                  </h4>
                  <p className="text-xs font-bold text-[#784D28] uppercase tracking-wider">
                    {course.faculty || course.category} · {course.department || student.department || "Academic Department"}
                  </p>
                </div>

                <div className="pt-8 border-t border-neutral-200 grid grid-cols-3 items-end text-left text-xs gap-4">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Award Date</span>
                    <span className="font-bold text-black">{formatDate(enrollment.completedAt || new Date().toISOString())}</span>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-black bg-neutral-50 mx-auto flex items-center justify-center font-black text-[10px] tracking-wider text-black">
                      SEAL
                    </div>
                    <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1 block">Institutional Seal</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Verification ID</span>
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
    </main>
  );
}
