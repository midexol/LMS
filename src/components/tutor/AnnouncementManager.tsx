"use client";

import React, { useState } from "react";
import { formatDate } from "@/lib/utils";
import { PiTrash } from "react-icons/pi";

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface Course {
  id: string;
  title: string;
  announcements: Announcement[];
}

interface AnnouncementManagerProps {
  courses: Course[];
}

export function AnnouncementManager({ courses }: AnnouncementManagerProps) {
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "");
  const [announcementsByCourse, setAnnouncementsByCourse] = useState<
    Record<string, Announcement[]>
  >(
    courses.reduce((acc, c) => ({ ...acc, [c.id]: c.announcements }), {})
  );

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const currentAnnouncements = announcementsByCourse[selectedCourseId] || [];

  const handlePost = async () => {
    if (!newTitle.trim() || !newContent.trim() || !selectedCourseId) return;
    setPosting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: selectedCourseId, title: newTitle.trim(), content: newContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post announcement.");

      setAnnouncementsByCourse((prev) => ({
        ...prev,
        [selectedCourseId]: [data.announcement, ...(prev[selectedCourseId] || [])],
      }));
      setNewTitle("");
      setNewContent("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (announcementId: string) => {
    setDeleting(announcementId);
    try {
      const res = await fetch(`/api/announcements?id=${announcementId}`, { method: "DELETE" });
      if (res.ok) {
        setAnnouncementsByCourse((prev) => ({
          ...prev,
          [selectedCourseId]: prev[selectedCourseId].filter((a) => a.id !== announcementId),
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-6 sm:p-8 rounded-lg bg-white border border-rule space-y-5 sm:space-y-6">
      <h2 className="text-xl font-bold text-black flex items-center gap-2 border-b border-rule pb-3">
        Course Announcements Manager
      </h2>

      {/* Course Selector */}
      <div>
        <label className="block text-xs font-bold text-neutral-700 mb-1 normal-case sm:uppercase tracking-normal sm:tracking-wider">Select Course</label>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-[#F7F2F6] border border-rule text-sm text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {/* New Announcement Form */}
      <div className="p-5 rounded-xl bg-[#F7F2F6] border border-rule space-y-3">
        <h3 className="text-sm font-bold text-black">Post New Announcement</h3>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-[#F3EAF2] border border-neutral-300 text-black text-xs font-bold flex items-center gap-2">
            Announcement posted successfully.
          </div>
        )}

        <input
          type="text"
          placeholder="Announcement title..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-white border border-rule text-sm text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all"
        />
        <textarea
          rows={3}
          placeholder="Write your announcement message here..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-white border border-rule text-sm text-black outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] transition-all"
        />
        <button
          onClick={handlePost}
          disabled={posting || !newTitle.trim() || !newContent.trim()}
          className="px-5 py-2.5 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] disabled:opacity-60 text-white font-bold text-xs normal-case sm:uppercase tracking-normal sm:tracking-wider flex items-center gap-2 transition-all"
        >
          {posting ? "Posting..." : "Post Announcement"}
        </button>
      </div>

      {/* Existing Announcements */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700">
          Posted Announcements ({currentAnnouncements.length})
        </h3>

        {currentAnnouncements.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-4">
            No announcements posted for this course yet.
          </p>
        ) : (
          currentAnnouncements.map((a) => (
            <div
              key={a.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-bold text-slate-900 text-sm">{a.title}</h4>
                  <span className="text-xs sm:text-[10px] text-slate-400 font-semibold">
                    {formatDate(a.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{a.content}</p>
              </div>
              <button
                onClick={() => handleDelete(a.id)}
                disabled={deleting === a.id}
                className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all shrink-0 disabled:opacity-50"
                title="Delete announcement"
              >
                <PiTrash className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
