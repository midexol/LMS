"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { formatDate, formatNgn } from "@/lib/utils";
import {
  FiShield, FiUsers, FiBookOpen, FiAward, FiDollarSign,
  FiCheckCircle, FiClock, FiTrash2, FiEdit2, FiLogOut,
  FiSearch, FiAlertCircle, FiX, FiActivity,
  FiToggleLeft, FiToggleRight, FiBarChart2, FiSliders,
  FiFilter, FiLayers, FiFileText, FiPlus, FiDownload,
  FiCompass, FiMail, FiInbox,
} from "react-icons/fi";

import { ACADEMIC_STRUCTURE, getDepartmentsForFaculty } from "@/lib/academicStructure";
import { BrandLogo } from "@/components/ui/BrandLogo";

/* ─── Types ─────────────────────────────────────────────────── */
interface UserItem {
  id: string; name: string; email: string; role: string;
  faculty?: string | null; department?: string | null;
  createdAt: string | Date;
  _count: { enrollments: number; submissions: number; courses: number };
}
interface CourseItem {
  id: string; title: string; price: number; category: string;
  faculty?: string | null; department?: string | null;
  level: string; published: boolean; createdAt: string | Date;
  description?: string;
  tutor: { id: string; name: string; email: string };
  _count: { modules: number; enrollments: number; announcements: number };
  modules?: Array<{ _count: { lessons: number } }>;
}
interface EnrollmentItem {
  id: string; status: string;
  enrolledAt: string | Date; completedAt: string | Date | null;
  student: { id: string; name: string; email: string; faculty?: string | null; department?: string | null };
  course: { id: string; title: string; price: number; category: string; faculty?: string | null; department?: string | null };
}
interface SubmissionItem {
  id: string; content: string; score: number | null;
  aiFeedback: string | null; tutorFeedback: string | null;
  status: string; submittedAt: string | Date;
  student: { id: string; name: string; email: string };
  assignment: {
    id: string; title: string; maxScore: number;
    lesson: { module: { course: { id: string; title: string } } };
  };
}
interface Metrics {
  totalUsers: number; totalStudents: number; totalTutors: number;
  totalCourses: number; publishedCourses: number;
  totalEnrollments: number; activeEnrollmentsCount: number;
  completedEnrollmentsCount: number; totalSubmissions: number; totalRevenue: number;
}
interface ContactMessageItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string | Date;
}

interface Props {
  currentUser: { id: string; name: string; email: string; role: string };
  initialUsers: UserItem[];
  initialCourses: CourseItem[];
  initialEnrollments: EnrollmentItem[];
  initialSubmissions: SubmissionItem[];
  initialMessages: ContactMessageItem[];
  metrics: Metrics;
  initialTab?: "overview" | "users" | "courses" | "enrollments" | "submissions" | "messages" | "settings";
}

/* ─── Toast Hook ─────────────────────────────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState<{ id: string; type: "success" | "error"; text: string }[]>([]);
  const push = (type: "success" | "error", text: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id, type, text }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  };
  return { toasts, success: (t: string) => push("success", t), error: (t: string) => push("error", t) };
}

/* ─── Confirm Modal ──────────────────────────────────────────── */
function ConfirmModal({ title, body, onConfirm, onCancel, loading }: {
  title: string; body: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-neutral-200 shadow-2xl p-7 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-neutral-100 text-black">
            <FiAlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-black text-base">{title}</h3>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{body}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-full border border-neutral-200 text-neutral-600 font-bold text-xs hover:bg-neutral-100">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs disabled:opacity-50">
            {loading ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit User Modal ────────────────────────────────────────── */
function EditUserModal({ user, currentAdminId, onSave, onClose }: {
  user: UserItem; currentAdminId: string;
  onSave: (userId: string, role: string, newPassword: string, faculty?: string, department?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [role, setRole] = useState(user.role);
  const [faculty, setFaculty] = useState(user.faculty || ACADEMIC_STRUCTURE[0].name);
  const [department, setDepartment] = useState(
    user.department || getDepartmentsForFaculty(user.faculty || ACADEMIC_STRUCTURE[0].name)[0] || ""
  );
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleFacultyChange = (newFac: string) => {
    setFaculty(newFac);
    const depts = getDepartmentsForFaculty(newFac);
    setDepartment(depts[0] || "");
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(user.id, role, password, faculty, department);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-neutral-200 shadow-2xl p-7 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-black">Edit User Account</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500">
            <FiX className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-neutral-100 border border-neutral-200">
          <p className="font-bold text-black text-sm">{user.name}</p>
          <p className="text-xs text-neutral-500">{user.email}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">Assign Role</label>
            <div className="grid grid-cols-3 gap-2">
              {["STUDENT", "TUTOR", "ADMIN"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => r !== "ADMIN" || user.id !== currentAdminId ? setRole(r) : null}
                  disabled={r === "ADMIN" && user.id === currentAdminId && role === "ADMIN"}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    role === r
                      ? "bg-[#4A1A45] text-white border-[#4A1A45]"
                      : "bg-white text-neutral-600 border-neutral-300 hover:border-black"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {user.id === currentAdminId && (
              <p className="text-[10px] text-[#4A1A45] font-bold mt-1">You cannot change your own admin role.</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">Faculty / School</label>
            <select
              value={faculty}
              onChange={(e) => handleFacultyChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-black outline-none focus:border-[#4A1A45]"
            >
              {ACADEMIC_STRUCTURE.map((f) => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-black outline-none focus:border-[#4A1A45]"
            >
              {getDepartmentsForFaculty(faculty).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">Reset Password (optional)</label>
            <input
              type="password"
              placeholder="Leave blank to preserve current"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black outline-none focus:border-[#4A1A45]"
            />
            {password && password.length < 6 && (
              <p className="text-[10px] text-red-600 font-bold mt-1">Min 6 characters required.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-full border border-neutral-200 text-neutral-600 text-xs font-bold hover:bg-neutral-100">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!!password && password.length < 6)}
            className="px-5 py-2 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Grade Override Modal ───────────────────────────────────── */
function GradeOverrideModal({ sub, onSave, onClose }: {
  sub: SubmissionItem;
  onSave: (id: string, score: number, feedback: string) => Promise<void>;
  onClose: () => void;
}) {
  const [score, setScore] = useState(sub.score ?? 0);
  const [feedback, setFeedback] = useState(sub.tutorFeedback ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(sub.id, score, feedback);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-200 shadow-2xl p-7 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-black">Grade Override Desk</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500">
            <FiX className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3.5 rounded-2xl bg-neutral-100 border border-neutral-200 space-y-1">
          <p className="text-[10px] font-bold text-[#4A1A45] uppercase">{sub.assignment.lesson.module.course.title}</p>
          <p className="font-bold text-black text-sm">{sub.assignment.title}</p>
          <p className="text-xs text-neutral-500">Student: {sub.student.name}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
              Adjusted Score (0 to {sub.assignment.maxScore})
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={sub.assignment.maxScore}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="flex-1 accent-black"
              />
              <span className={`text-xl font-bold w-12 text-center ${score >= 70 ? "text-black" : "text-neutral-500"}`}>
                {score}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-neutral-500 mt-0.5">
              <span>0</span>
              <span>{sub.assignment.maxScore}</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">Superadmin Feedback Note</label>
            <textarea
              rows={3}
              placeholder="Reason for this grade adjustment..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black outline-none focus:border-[#4A1A45]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-full border border-neutral-200 text-neutral-600 text-xs font-bold hover:bg-neutral-100">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs disabled:opacity-50">
            {saving ? "Saving..." : "Apply Override"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Role Badge ─────────────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    ADMIN: "bg-black text-white border-black",
    TUTOR: "bg-neutral-800 text-white border-neutral-800",
    STUDENT: "bg-neutral-100 text-neutral-800 border-neutral-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${map[role] || map.STUDENT}`}>
      {role}
    </span>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export function AdminDashboardClient({
  currentUser, initialUsers, initialCourses, initialEnrollments, initialSubmissions, initialMessages, metrics, initialTab = "overview",
}: Props) {
  const { toasts, success, error } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "courses" | "enrollments" | "submissions" | "messages" | "settings">(initialTab);

  const switchTab = (t: "overview" | "users" | "courses" | "enrollments" | "submissions" | "messages" | "settings") => {
    setActiveTab(t);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", t);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const [users, setUsers] = useState(initialUsers);
  const [courses, setCourses] = useState(initialCourses);
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [messages, setMessages] = useState(initialMessages);
  const [messageFilter, setMessageFilter] = useState<"ALL" | "NEW">("ALL");
  const unreadCount = messages.filter((m) => m.status === "NEW").length;

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [userDeptFilter, setUserDeptFilter] = useState("ALL");
  const [courseSearch, setCourseSearch] = useState("");
  const [coursePublishedFilter, setCoursePublishedFilter] = useState("ALL");
  const [courseDeptFilter, setCourseDeptFilter] = useState("ALL");

  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null);
  const [deleteCourse, setDeleteCourse] = useState<CourseItem | null>(null);
  const [revokeEnrollment, setRevokeEnrollment] = useState<EnrollmentItem | null>(null);
  const [gradeOverrideSub, setGradeOverrideSub] = useState<SubmissionItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Settings & Security state
  const [adminCurrentPassword, setAdminCurrentPassword] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [adminPasswordLoading, setAdminPasswordLoading] = useState(false);

  // Check URL query parameters for ?tab=
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["overview", "users", "courses", "enrollments", "submissions", "messages", "settings"].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((r) =>
          r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success(`Generated and exported ${filename}`);
  };

  const handleToggleMessageRead = async (msg: ContactMessageItem) => {
    const nextStatus = msg.status === "NEW" ? "READ" : "NEW";
    try {
      const res = await fetch("/api/admin/contact-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update message.");
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: nextStatus } : m)));
    } catch (e: any) {
      error(e.message || "Failed to update message.");
    }
  };

  const handleDeleteMessage = async (msg: ContactMessageItem) => {
    try {
      const res = await fetch(`/api/admin/contact-messages?id=${encodeURIComponent(msg.id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete message.");
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      success("Message deleted.");
    } catch (e: any) {
      error(e.message || "Failed to delete message.");
    }
  };

  const handleUpdateAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNewPassword || adminNewPassword.length < 6) {
      error("Password must be at least 6 characters.");
      return;
    }
    if (!adminCurrentPassword) {
      error("Enter your current password.");
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      error("Passwords do not match.");
      return;
    }
    setAdminPasswordLoading(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: currentUser.name, password: adminNewPassword, currentPassword: adminCurrentPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password.");
      success("Superadmin password updated successfully.");
      setAdminCurrentPassword("");
      setAdminNewPassword("");
      setAdminConfirmPassword("");
    } catch (e: any) {
      error(e.message || "Failed to update password.");
    } finally {
      setAdminPasswordLoading(false);
    }
  };


  /* ─── Handlers ─────────────────────────────────────── */
  const handleUpdateUser = async (userId: string, role: string, newPassword: string, faculty?: string, department?: string) => {
    const payload: any = { userId };
    if (role) payload.role = role;
    if (newPassword?.trim()) payload.newPassword = newPassword.trim();
    if (faculty !== undefined) payload.faculty = faculty;
    if (department !== undefined) payload.department = department;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers((p) => p.map((u) => u.id === userId ? { ...u, role: data.user.role, faculty: data.user.faculty, department: data.user.department } : u));
      setEditUser(null);
      success("User updated successfully.");
    } catch (e: any) {
      error(e.message || "Failed to update user.");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users?id=${deleteUser.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers((p) => p.filter((u) => u.id !== deleteUser.id));
      success("User account removed.");
    } catch (e: any) {
      error(e.message || "Failed to delete user.");
    } finally {
      setActionLoading(false);
      setDeleteUser(null);
    }
  };

  const handleTogglePublish = async (c: CourseItem) => {
    try {
      const res = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: c.id, published: !c.published }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCourses((p) => p.map((x) => x.id === c.id ? { ...x, published: data.course.published } : x));
      success(`Course ${data.course.published ? "published" : "unpublished"}.`);
    } catch (e: any) {
      error(e.message || "Failed to update course.");
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteCourse) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/courses?id=${deleteCourse.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCourses((p) => p.filter((c) => c.id !== deleteCourse.id));
      success("Course deleted permanently.");
    } catch (e: any) {
      error(e.message || "Failed to delete course.");
    } finally {
      setActionLoading(false);
      setDeleteCourse(null);
    }
  };

  const handleRevokeEnrollment = async () => {
    if (!revokeEnrollment) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/enrollments?id=${revokeEnrollment.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke enrollment.");
      setEnrollments((p) => p.filter((item) => item.id !== revokeEnrollment.id));
      success(`Enrollment for ${revokeEnrollment.student.name} revoked and unlocked.`);
    } catch (e: any) {
      error(e.message || "Failed to revoke enrollment.");
    } finally {
      setActionLoading(false);
      setRevokeEnrollment(null);
    }
  };


  const handleGradeOverride = async (id: string, score: number, feedback: string) => {
    try {
      const res = await fetch("/api/tutor/grade-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: id, newScore: score, tutorFeedback: feedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmissions((p) => p.map((s) => s.id === id ? { ...s, score, tutorFeedback: feedback } : s));
      setGradeOverrideSub(null);
      success("Grade override successfully applied.");
    } catch (e: any) {
      error(e.message || "Failed to override grade.");
    }
  };

  /* ─── Filtering ────────────────────────────────────── */
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = !userSearch.trim() ||
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.department && u.department.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.faculty && u.faculty.toLowerCase().includes(userSearch.toLowerCase()));
      const matchesRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
      const matchesDept = userDeptFilter === "ALL" || u.department === userDeptFilter;
      return matchesSearch && matchesRole && matchesDept;
    });
  }, [users, userSearch, userRoleFilter, userDeptFilter]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch = !courseSearch.trim() ||
        c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
        c.tutor.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
        (c.department && c.department.toLowerCase().includes(courseSearch.toLowerCase()));
      const matchesPub =
        coursePublishedFilter === "ALL" ||
        (coursePublishedFilter === "PUBLISHED" && c.published) ||
        (coursePublishedFilter === "DRAFT" && !c.published);
      const matchesDept = courseDeptFilter === "ALL" || c.department === courseDeptFilter;
      return matchesSearch && matchesPub && matchesDept;
    });
  }, [courses, courseSearch, coursePublishedFilter, courseDeptFilter]);

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-black">
      {/* Toast */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 border ${
              t.type === "success"
                ? "bg-black text-white border-black"
                : "bg-red-600 text-white border-red-600"
            }`}
          >
            {t.type === "success" ? <FiCheckCircle className="w-4 h-4 text-white" /> : <FiAlertCircle className="w-4 h-4 text-white" />}
            {t.text}
          </div>
        ))}
      </div>

      {/* Modals */}
      {deleteUser && (
        <ConfirmModal
          title={`Delete User: ${deleteUser.name}?`}
          body="This action is irreversible. All student records tied to this user will be removed."
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteUser(null)}
          loading={actionLoading}
        />
      )}
      {deleteCourse && (
        <ConfirmModal
          title={`Delete Course: ${deleteCourse.title}?`}
          body="All modules, lessons, and enrollment history for this course will be permanently erased."
          onConfirm={handleDeleteCourse}
          onCancel={() => setDeleteCourse(null)}
          loading={actionLoading}
        />
      )}
      {revokeEnrollment && (
        <ConfirmModal
          title={`Revoke Enrollment: ${revokeEnrollment.student.name}?`}
          body={`This will release the active course lock on "${revokeEnrollment.course.title}" for ${revokeEnrollment.student.name}, allowing them to register for a different course.`}
          onConfirm={handleRevokeEnrollment}
          onCancel={() => setRevokeEnrollment(null)}
          loading={actionLoading}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          currentAdminId={currentUser.id}
          onSave={handleUpdateUser}
          onClose={() => setEditUser(null)}
        />
      )}
      {gradeOverrideSub && (
        <GradeOverrideModal
          sub={gradeOverrideSub}
          onSave={handleGradeOverride}
          onClose={() => setGradeOverrideSub(null)}
        />
      )}

      {/* ───────────────── HEADER (RICH COMMAND CENTER BLACK) ───────────────── */}
      <header className="bg-neutral-950 text-white border-b border-neutral-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-18 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BrandLogo href="/admin" variant="light" size="sm" />
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-neutral-800 text-[11px]">
              <span className="font-bold text-[#D6BDD4]">Superadmin Console</span>
              <span className="text-neutral-500">· System Command &amp; Analytics</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => switchTab("settings")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all ${
                activeTab === "settings"
                  ? "bg-white text-black border-white shadow-sm"
                  : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:border-neutral-700"
              }`}
            >
              <FiSliders className="w-3.5 h-3.5 text-[#D6BDD4]" />
              <span>Settings</span>
            </button>
            <Link
              href="/profile"
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-800 bg-neutral-900 text-xs font-bold text-neutral-300 hover:text-white hover:border-neutral-700 transition-all"
            >
              <FiShield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Profile</span>
            </Link>
            <Link
              href="/courses"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-800 bg-neutral-900 text-xs font-bold text-neutral-300 hover:text-white hover:border-neutral-700 transition-all"
            >
              <FiBookOpen className="w-3.5 h-3.5 text-[#D6BDD4]" />
              <span>Student Catalog</span>
            </Link>
            <Link
              href="/instructor"
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-800 bg-neutral-900 text-xs font-bold text-neutral-300 hover:text-white hover:border-neutral-700 transition-all"
            >
              <FiLayers className="w-3.5 h-3.5 text-[#D6BDD4]" />
              <span>Instructor Studio</span>
            </Link>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-colors shadow-sm"
            >
              <FiLogOut className="w-3.5 h-3.5 text-neutral-700" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-2 overflow-x-auto border-t border-neutral-800/80 py-2.5">
          {[
            { id: "overview", label: "Dashboard & Analytics", icon: FiBarChart2 },
            { id: "users", label: "Users & Roles", count: users.length, icon: FiUsers },
            { id: "courses", label: "Courses Oversight", count: courses.length, icon: FiBookOpen },
            { id: "enrollments", label: "Enrollment Audit", count: enrollments.length, icon: FiAward },
            { id: "submissions", label: "Submissions & Grades", count: submissions.length, icon: FiActivity },
            { id: "messages", label: "Inbox", count: unreadCount, icon: FiInbox },
            { id: "settings", label: "System Settings", icon: FiSliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                  active
                    ? "bg-white text-[#4A1A45] shadow-sm font-bold"
                    : "text-neutral-300 hover:text-white hover:bg-[#3B1537]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    active ? "bg-[#4A1A45] text-white" : "bg-white/10 text-neutral-300"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ───────────────── CANVAS ───────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* OVERVIEW / ANALYTICS TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Banner - Pure Jet Black with Brown Accent */}
            <div
              className="rounded-3xl p-8 text-white relative overflow-hidden shadow-md"
              style={{
                background: "linear-gradient(115deg, #1E0A1C 0%, #2D0F2A 55%, #4A1A45 85%, #6B2764 100%)",
              }}
            >
              <div className="max-w-xl space-y-2 relative">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#D6BDD4]">System Intelligence</span>
                <h2 className="font-bold text-3xl">Platform Performance Overview</h2>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Real-time analytics covering platform enrollments, revenue, completion ratios, and assignment throughput.
                </p>
                <div className="pt-3 flex items-center gap-4 text-xs">
                  <span className="px-4 py-2 rounded-full bg-white text-[#4A1A45] font-bold">
                    Revenue: {formatNgn(metrics.totalRevenue)}
                  </span>
                  <span className="text-neutral-300">
                    {metrics.activeEnrollmentsCount} active student enrollments
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Stat Cards (High-Contrast Executive Black Cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Accounts", value: metrics.totalUsers, sub: `${metrics.totalStudents} students · ${metrics.totalTutors} instructors` },
                { label: "Published Courses", value: `${metrics.publishedCourses} / ${metrics.totalCourses}`, sub: "Live in catalog" },
                { label: "Active Enrollments", value: metrics.activeEnrollmentsCount, sub: `${metrics.completedEnrollmentsCount} completed` },
                { label: "Submissions Logged", value: metrics.totalSubmissions, sub: "Automated & faculty reviews" },
              ].map((c, i) => (
                <div key={i} className="bg-[#2D0F2A] text-white rounded-3xl p-6 border border-[#3B1537] shadow-md flex flex-col justify-between space-y-4 hover:border-[#4A1A45]/60 transition-all">
                  <p className="text-xs text-neutral-400 font-semibold tracking-wide uppercase">{c.label}</p>
                  <div>
                    <div className="text-2xl font-bold text-white tracking-tight">{c.value}</div>
                    <p className="text-[11px] text-neutral-400 mt-1">{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Analytics Row: Modern Dual Bar & SVG Ring Distribution (CLEAR & READABLE) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category Throughput Dual Comparison */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                  <div>
                    <h3 className="font-black text-lg text-black tracking-tight">Enrollment Throughput by Academic Track</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Live active cohorts vs certified course completions</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-black inline-block" />
                      <span>Active Enrollees</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4A1A45] inline-block" />
                      <span>Certified (70%+)</span>
                    </div>
                  </div>
                </div>

                {/* 3 Executive KPI Capsules */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
                      <FiActivity className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Active Cohorts</span>
                      <span className="text-lg font-black text-neutral-900 leading-tight">
                        {metrics.activeEnrollmentsCount} <span className="text-xs font-semibold text-neutral-500">enrolled</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#4A1A45]/15 text-[#4A1A45] border border-[#4A1A45]/20 flex items-center justify-center shrink-0">
                      <FiAward className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Certifications</span>
                      <span className="text-lg font-black text-[#4A1A45] leading-tight">
                        {metrics.completedEnrollmentsCount} <span className="text-xs font-semibold text-neutral-500">completed</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-neutral-200 text-neutral-800 flex items-center justify-center shrink-0">
                      <FiCheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Completion Velocity</span>
                      <span className="text-lg font-black text-neutral-900 leading-tight">
                        {metrics.activeEnrollmentsCount + metrics.completedEnrollmentsCount > 0
                          ? Math.round((metrics.completedEnrollmentsCount / (metrics.activeEnrollmentsCount + metrics.completedEnrollmentsCount)) * 100)
                          : 0}% <span className="text-xs font-semibold text-neutral-500">rate</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dynamically Computed Track Performance with Modern Comparative Bars */}
                {(() => {
                  const categoriesMap = new Map<string, { active: number; comp: number; courses: number }>();
                  courses.forEach((c) => {
                    const cat = c.category || "General";
                    if (!categoriesMap.has(cat)) categoriesMap.set(cat, { active: 0, comp: 0, courses: 0 });
                    categoriesMap.get(cat)!.courses += 1;
                  });
                  enrollments.forEach((e) => {
                    const cat = e.course?.category || "General";
                    if (!categoriesMap.has(cat)) categoriesMap.set(cat, { active: 0, comp: 0, courses: 0 });
                    const item = categoriesMap.get(cat)!;
                    if (e.status === "ACTIVE") item.active += 1;
                    else if (e.status === "COMPLETED") item.comp += 1;
                  });

                  const tracks = Array.from(categoriesMap.entries()).map(([cat, data]) => ({
                    cat,
                    active: data.active,
                    comp: data.comp,
                    courses: data.courses,
                    total: data.active + data.comp,
                  }));

                  const displayTracks = tracks.length > 0 ? tracks : [
                    { cat: "Software Engineering", active: 1, comp: 0, courses: 2, total: 1 },
                    { cat: "Design & UX", active: 0, comp: 0, courses: 1, total: 0 },
                    { cat: "Data Science & AI", active: 0, comp: 0, courses: 1, total: 0 },
                  ];

                  const maxTotal = Math.max(1, ...displayTracks.map((t) => Math.max(t.active, t.comp, 1)));

                  return (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-3">
                        {displayTracks.map((track) => {
                          const activePercent = Math.min(100, Math.round((track.active / maxTotal) * 100));
                          const compPercent = Math.min(100, Math.round((track.comp / maxTotal) * 100));

                          return (
                            <div
                              key={track.cat}
                              className="p-4 rounded-2xl bg-neutral-50/70 hover:bg-neutral-50 border border-neutral-100 hover:border-neutral-200 transition-all space-y-2.5 group"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-neutral-400 group-hover:bg-[#4A1A45] transition-colors" />
                                  <span className="font-bold text-xs sm:text-sm text-neutral-900">
                                    {track.cat}
                                  </span>
                                  <span className="text-[10px] text-neutral-400 font-semibold">
                                    ({track.courses} {track.courses === 1 ? "course" : "courses"})
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    track.active > 0
                                      ? "bg-black text-white"
                                      : "bg-neutral-200/70 text-neutral-500"
                                  }`}>
                                    {track.active} active
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    track.comp > 0
                                      ? "bg-[#4A1A45] text-white"
                                      : "bg-neutral-200/70 text-neutral-500"
                                  }`}>
                                    {track.comp} certified
                                  </span>
                                </div>
                              </div>

                              {/* Dual Gradient Progress Tracks */}
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider w-14 shrink-0">
                                    Enrolled
                                  </span>
                                  <div className="w-full h-2.5 bg-neutral-200/60 rounded-full overflow-hidden relative">
                                    {track.active > 0 ? (
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-neutral-900 to-black transition-all duration-700"
                                        style={{ width: `${Math.max(6, activePercent)}%` }}
                                      />
                                    ) : (
                                      <div className="h-full w-2 rounded-full bg-neutral-300 opacity-40" />
                                    )}
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-neutral-700 w-6 text-right shrink-0">
                                    {track.active}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider w-14 shrink-0">
                                    Certified
                                  </span>
                                  <div className="w-full h-2.5 bg-neutral-200/60 rounded-full overflow-hidden relative">
                                    {track.comp > 0 ? (
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#6B2764] to-[#4A1A45] transition-all duration-700"
                                        style={{ width: `${Math.max(6, compPercent)}%` }}
                                      />
                                    ) : (
                                      <div className="h-full w-2 rounded-full bg-neutral-300 opacity-40" />
                                    )}
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-[#4A1A45] w-6 text-right shrink-0">
                                    {track.comp}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Platform Composition Breakdown */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-sm space-y-6 flex flex-col justify-between">
                <div className="pb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <FiUsers className="w-4 h-4 text-[#4A1A45]" />
                    <h3 className="font-black text-lg text-black tracking-tight">Platform Composition</h3>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">Distribution across active system accounts</p>
                </div>

                {/* SVG Ring Chart (Computed from users props) */}
                {(() => {
                  const total = users.length || 1;
                  const sCount = users.filter((u) => u.role === "STUDENT").length;
                  const tCount = users.filter((u) => u.role === "TUTOR").length;
                  const aCount = users.filter((u) => u.role === "ADMIN" || u.role === "SUPERADMIN").length;

                  const sPct = Math.round((sCount / total) * 100);
                  const tPct = Math.round((tCount / total) * 100);
                  const aPct = Math.max(0, 100 - sPct - tPct);

                  const circumference = 226.2;
                  const dashS = (sPct / 100) * circumference;
                  const dashT = (tPct / 100) * circumference;
                  const dashA = Math.max(0, circumference - dashS - dashT);

                  return (
                    <>
                      <div className="relative w-48 h-48 mx-auto flex items-center justify-center my-2">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform drop-shadow-xs">
                          {/* Background Track Ring */}
                          <circle cx="50" cy="50" r="36" stroke="#F4F4F5" strokeWidth="10" fill="none" />

                          {/* Students segment */}
                          {sPct > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="36"
                              stroke="#000000"
                              strokeWidth="10"
                              strokeDasharray={`${dashS} ${circumference}`}
                              strokeDashoffset="0"
                              strokeLinecap="round"
                              fill="none"
                            />
                          )}

                          {/* Faculty/Instructors segment */}
                          {tPct > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="36"
                              stroke="#4A1A45"
                              strokeWidth="10"
                              strokeDasharray={`${dashT} ${circumference}`}
                              strokeDashoffset={`-${dashS}`}
                              strokeLinecap="round"
                              fill="none"
                            />
                          )}

                          {/* Admins segment */}
                          {aPct > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="36"
                              stroke="#A1A1AA"
                              strokeWidth="10"
                              strokeDasharray={`${dashA} ${circumference}`}
                              strokeDashoffset={`-${dashS + dashT}`}
                              strokeLinecap="round"
                              fill="none"
                            />
                          )}
                        </svg>

                        {/* Center Statistics Capsule */}
                        <div className="absolute w-28 h-28 rounded-full bg-white shadow-xs border border-neutral-100 flex flex-col items-center justify-center text-center p-2">
                          <FiUsers className="w-4 h-4 text-[#4A1A45] mb-0.5" />
                          <span className="font-black text-2xl text-black leading-none">{total}</span>
                          <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-1">Directory</span>
                        </div>
                      </div>

                      {/* 3 Executive Role Breakdown Cards */}
                      <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                        {/* Students Card */}
                        <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center text-[11px] font-bold">
                                <FiBookOpen className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-neutral-900">Students</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-black">{sCount}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-800">
                                {sPct}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-neutral-200/70 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-black h-full rounded-full transition-all duration-700" style={{ width: `${sPct}%` }} />
                          </div>
                        </div>

                        {/* Faculty & Tutors Card */}
                        <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-[#4A1A45]/15 text-[#4A1A45] border border-[#4A1A45]/25 flex items-center justify-center text-[11px] font-bold">
                                <FiAward className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-neutral-900">Faculty &amp; Tutors</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-[#4A1A45]">{tCount}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4A1A45]/10 text-[#4A1A45]">
                                {tPct}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-neutral-200/70 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#4A1A45] h-full rounded-full transition-all duration-700" style={{ width: `${tPct}%` }} />
                          </div>
                        </div>

                        {/* Administrators Card */}
                        <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-neutral-200 text-neutral-700 flex items-center justify-center text-[11px] font-bold">
                                <FiShield className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-neutral-900">Administrators</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-neutral-800">{aCount}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-700">
                                {aPct}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-neutral-200/70 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-neutral-500 h-full rounded-full transition-all duration-700" style={{ width: `${aPct}%` }} />
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-neutral-200 p-5 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm flex-wrap">
              <div className="relative flex-1 min-w-[220px] w-full">
                <FiSearch className="absolute left-3.5 top-2.5 text-neutral-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or department..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-neutral-50 border border-neutral-200 text-xs text-black outline-none focus:border-[#4A1A45]"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-4 py-2 rounded-full bg-neutral-50 border border-neutral-200 text-xs font-bold text-black outline-none"
                >
                  <option value="ALL">All Roles ({users.length})</option>
                  <option value="STUDENT">Students ({metrics.totalStudents})</option>
                  <option value="TUTOR">Instructors ({metrics.totalTutors})</option>
                  <option value="ADMIN">Superadmins</option>
                </select>

                <select
                  value={userDeptFilter}
                  onChange={(e) => setUserDeptFilter(e.target.value)}
                  className="px-3.5 py-2 rounded-full bg-neutral-50 border border-neutral-200 text-xs font-bold text-black outline-none max-w-[210px]"
                >
                  <option value="ALL">All Departments</option>
                  {ACADEMIC_STRUCTURE.flatMap((f) => f.departments).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 font-bold bg-neutral-50">
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Department &amp; School</th>
                    <th className="p-4">Enrollments</th>
                    <th className="p-4">Submissions</th>
                    <th className="p-4">Registered</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser.id;
                    return (
                      <tr key={u.id} className="hover:bg-neutral-50">
                        <td className="p-4">
                          <p className="font-bold text-black">{u.name}</p>
                          <p className="text-[10px] text-neutral-500">{u.email}</p>
                        </td>
                        <td className="p-4"><RoleBadge role={u.role} /></td>
                        <td className="p-4">
                          {u.department ? (
                            <div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-black border border-neutral-200 inline-block truncate max-w-[190px]">
                                {u.department}
                              </span>
                              <span className="text-[10px] text-neutral-400 block truncate max-w-[190px] mt-0.5">
                                {u.faculty}
                              </span>
                            </div>
                          ) : (
                            <span className="text-neutral-400 italic text-[11px]">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4 text-black font-bold">{u._count.enrollments}</td>
                        <td className="p-4 text-black font-bold">{u._count.submissions}</td>
                        <td className="p-4 text-neutral-500">{formatDate(u.createdAt)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditUser(u)}
                              className="p-1.5 rounded-lg border border-neutral-200 text-black hover:bg-neutral-100"
                              title="Edit user role / password"
                            >
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isSelf && (
                              <button
                                onClick={() => setDeleteUser(u)}
                                className="p-1.5 rounded-lg border border-neutral-200 text-black hover:text-red-600 hover:border-red-300"
                                title="Delete user"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COURSES TAB */}
        {activeTab === "courses" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-neutral-200 p-5 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm flex-wrap">
              <div className="relative flex-1 min-w-[220px] w-full">
                <FiSearch className="absolute left-3.5 top-2.5 text-neutral-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search courses by title, instructor, or department..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-neutral-50 border border-neutral-200 text-xs text-black outline-none focus:border-[#4A1A45]"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={coursePublishedFilter}
                  onChange={(e) => setCoursePublishedFilter(e.target.value)}
                  className="px-4 py-2 rounded-full bg-neutral-50 border border-neutral-200 text-xs font-bold text-black outline-none"
                >
                  <option value="ALL">All Status ({courses.length})</option>
                  <option value="PUBLISHED">Published ({metrics.publishedCourses})</option>
                  <option value="DRAFT">Drafts ({metrics.totalCourses - metrics.publishedCourses})</option>
                </select>

                <select
                  value={courseDeptFilter}
                  onChange={(e) => setCourseDeptFilter(e.target.value)}
                  className="px-3.5 py-2 rounded-full bg-neutral-50 border border-neutral-200 text-xs font-bold text-black outline-none max-w-[210px]"
                >
                  <option value="ALL">All Departments</option>
                  {ACADEMIC_STRUCTURE.flatMap((f) => f.departments).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses.map((c) => (
                <div key={c.id} className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between flex-wrap gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.department && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black text-white">
                            {c.department}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-[#4A1A45] uppercase">{c.faculty || c.category} · {c.level}</span>
                      </div>
                      <span className="font-bold text-base text-black">
                        {c.price === 0 ? "Free" : formatNgn(c.price)}
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-black">{c.title}</h4>
                    <p className="text-xs text-neutral-500">Instructor: <strong>{c.tutor.name}</strong></p>
                    <p className="text-xs text-neutral-500 line-clamp-2">{c.description}</p>
                  </div>
                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <button
                      onClick={() => handleTogglePublish(c)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                        c.published ? "bg-black text-white" : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                      }`}
                    >
                      {c.published ? <FiToggleRight className="w-4 h-4" /> : <FiToggleLeft className="w-4 h-4" />}
                      {c.published ? "Published" : "Draft"}
                    </button>
                    <button
                      onClick={() => setDeleteCourse(c)}
                      className="p-2 rounded-full border border-neutral-200 text-neutral-600 hover:text-red-600"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ENROLLMENTS TAB */}
        {activeTab === "enrollments" && (
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 font-bold bg-neutral-50">
                  <th className="p-4">Student</th>
                  <th className="p-4">Course</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Enrolled Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {enrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-neutral-50">
                    <td className="p-4">
                      <p className="font-bold text-black">{e.student.name}</p>
                      <p className="text-[10px] text-neutral-500">{e.student.department || e.student.email}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-[#4A1A45] font-bold">{e.course.title}</p>
                      <p className="text-[10px] text-neutral-500">{e.course.department || e.course.category}</p>
                    </td>
                    <td className="p-4 font-bold text-black">
                      {e.course.price === 0 ? "Free" : formatNgn(e.course.price)}
                    </td>
                    <td className="p-4 text-neutral-500">{formatDate(e.enrolledAt)}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black text-white">
                        {e.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {e.status === "ACTIVE" && (
                        <button
                          onClick={() => setRevokeEnrollment(e)}
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-red-200 text-red-600 hover:bg-red-50 transition-all inline-flex items-center gap-1"
                          title="Revoke enrollment and release course lock"
                        >
                          <FiTrash2 className="w-3 h-3" /> Revoke Lock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SUBMISSIONS TAB */}
        {activeTab === "submissions" && (
          <div className="space-y-4">
            {submissions.map((sub) => {
              const max = sub.assignment.maxScore || 100;
              const isPass = sub.score !== null && (sub.score / max) * 100 >= 70;
              return (
                <div key={sub.id} className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-[#4A1A45] uppercase">
                        {sub.assignment.lesson.module.course.title}
                      </span>
                      <h4 className="font-bold text-base text-black">{sub.assignment.title}</h4>
                      <p className="text-xs text-neutral-500">Student: <strong>{sub.student.name}</strong> · Submitted {formatDate(sub.submittedAt)}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase block">Grade</span>
                        <span className={`font-bold text-xl ${isPass ? "text-black" : "text-[#4A1A45]"}`}>
                          {sub.score !== null ? `${sub.score} / ${max}` : "Pending"}
                        </span>
                      </div>
                      <button
                        onClick={() => setGradeOverrideSub(sub)}
                        className="px-4 py-2 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <FiSliders className="w-3.5 h-3.5" />
                        Override
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-100 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase block">Student Submission:</span>
                    <p className="text-neutral-800 leading-relaxed">{sub.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* INBOX TAB: messages from the public contact form */}
        {activeTab === "messages" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {(["ALL", "NEW"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setMessageFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    messageFilter === f
                      ? "bg-[#4A1A45] text-white border-[#4A1A45]"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-[#4A1A45]"
                  }`}
                >
                  {f === "ALL" ? `All (${messages.length})` : `Unread (${unreadCount})`}
                </button>
              ))}
            </div>

            {messages.filter((m) => messageFilter === "ALL" || m.status === "NEW").length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-neutral-200 text-center space-y-2">
                <FiInbox className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-sm font-semibold text-neutral-600">
                  {messages.length === 0 ? "No messages yet." : "No unread messages."}
                </p>
                <p className="text-xs text-neutral-400">Messages sent through the website contact form appear here.</p>
              </div>
            ) : (
              messages
                .filter((m) => messageFilter === "ALL" || m.status === "NEW")
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`bg-white rounded-3xl p-6 border shadow-sm space-y-3 ${
                      msg.status === "NEW" ? "border-[#4A1A45]/40" : "border-neutral-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {msg.status === "NEW" && (
                            <span className="px-2 py-0.5 rounded-full bg-[#4A1A45] text-white text-[10px] font-bold uppercase">New</span>
                          )}
                          <span className="text-[10px] font-bold text-[#4A1A45] uppercase">{msg.subject}</span>
                        </div>
                        <h4 className="font-bold text-base text-black">{msg.name}</h4>
                        <p className="text-xs text-neutral-500 break-all">
                          {msg.email} · {formatDate(msg.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`mailto:${msg.email}?subject=${encodeURIComponent("Re: " + msg.subject)}`}
                          onClick={() => msg.status === "NEW" && handleToggleMessageRead(msg)}
                          className="px-4 py-2 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                        >
                          <FiMail className="w-3.5 h-3.5" />
                          Reply
                        </a>
                        <button
                          onClick={() => handleToggleMessageRead(msg)}
                          className="px-4 py-2 rounded-full border border-neutral-200 hover:border-[#4A1A45] text-neutral-700 font-bold text-xs transition-all"
                        >
                          {msg.status === "NEW" ? "Mark read" : "Mark unread"}
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(msg)}
                          aria-label="Delete message"
                          className="p-2 rounded-full border border-neutral-200 hover:border-red-400 hover:text-red-600 text-neutral-500 transition-all"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="p-4 rounded-2xl bg-neutral-100 text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap break-words">
                      {msg.message}
                    </p>
                  </div>
                ))
            )}
          </div>
        )}

        {/* SETTINGS & SYSTEM CONTROLS TAB */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-5xl">
            <div>
              <h2 className="font-bold text-2xl text-black">System Settings &amp; Governance</h2>
              <p className="text-xs text-neutral-500">Configure institutional policies, superadmin credentials, and audit data export.</p>
            </div>

            {/* Superadmin Security & Profile Card */}
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center text-2xl font-bold shadow-md">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-black">{currentUser.name}</h3>
                    <p className="text-xs text-neutral-500">{currentUser.email}</p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black text-white">
                      Superadministrator
                    </span>
                  </div>
                </div>

                <div className="text-xs text-neutral-500 bg-neutral-50 px-4 py-3 rounded-2xl border border-neutral-200">
                  <span className="font-bold text-black block">System Authority Level: Highest</span>
                  <span>Full access to database, user records, course publishing, and grade ledgers.</span>
                </div>
              </div>

              {/* Password Change Form */}
              <form onSubmit={handleUpdateAdminPassword} className="space-y-4 max-w-xl">
                <h4 className="font-bold text-sm text-black uppercase tracking-wider flex items-center gap-2">
                  <FiSliders className="w-4 h-4 text-[#4A1A45]" /> Update Superadmin Password
                </h4>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                    Current Password
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your current password"
                    value={adminCurrentPassword}
                    onChange={(e) => setAdminCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black outline-none focus:border-[#4A1A45] transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black outline-none focus:border-[#4A1A45] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1.5 uppercase tracking-wider">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Re-enter password"
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black outline-none focus:border-[#4A1A45] transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={adminPasswordLoading || !adminNewPassword}
                  className="px-6 py-2.5 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all"
                >
                  {adminPasswordLoading ? "Updating..." : "Save New Password"}
                </button>
              </form>
            </div>

            {/* Institutional Configuration Card */}
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6">
              <h3 className="font-bold text-lg text-black border-b border-neutral-100 pb-3 flex items-center gap-2">
                <FiBookOpen className="w-5 h-5 text-[#4A1A45]" />
                Institutional Identity &amp; Academic Configuration
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">
                    Institution Name
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="The Federal Polytechnic, Ede"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-black cursor-default"
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">Accredited collegiate polytechnic repository.</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">
                    LMS Directorate Title
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="ACADEMIA Digital Learning Directorate"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-black cursor-default"
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">Displayed on official student certificates.</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">
                    Current Academic Session
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="2025/2026 Academic Session"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-black cursor-default"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">
                    Official Support Contact Email
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="academic.board@federalpolyede.edu.ng"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-black cursor-default"
                  />
                </div>
              </div>
            </div>

            {/* Academic Policies & Enrollment Rules */}
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6">
              <h3 className="font-bold text-lg text-black border-b border-neutral-100 pb-3 flex items-center gap-2">
                <FiAward className="w-5 h-5 text-[#4A1A45]" />
                Academic Policies &amp; Lock Enforcement
              </h3>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-black">1:1 Single Course Active Enrollment Rule</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Ensures focused student learning by locking concurrent registrations until current course is completed or dropped.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-black text-white">
                    Strictly Active
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-black">Certificate Completion Threshold</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Minimum required evaluation grade to unlock institutional seal and official certificate download.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#4A1A45] text-white">
                    70% Pass Score
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-black">Automated Evaluation Engine</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Instant evaluation feedback on student assignment submissions with superadmin grade override capability.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-black text-white">
                    Enabled
                  </span>
                </div>
              </div>
            </div>

            {/* Audit & Data Export Center */}
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6">
              <h3 className="font-bold text-lg text-black border-b border-neutral-100 pb-3 flex items-center gap-2">
                <FiDownload className="w-5 h-5 text-[#4A1A45]" />
                Institutional Ledger CSV Export Center
              </h3>
              <p className="text-xs text-neutral-500">
                Download verified real-time platform ledgers in CSV format for academic accreditation, external audits, and senate reporting.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <button
                  onClick={() =>
                    downloadCSV(
                      "users-directory.csv",
                      ["User ID", "Full Name", "Email", "Role", "Faculty", "Department", "Registered Date"],
                      users.map((u) => [u.id, u.name, u.email, u.role, u.faculty || "", u.department || "", String(u.createdAt)])
                    )
                  }
                  className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-black transition-all text-left space-y-2 group shadow-xs"
                >
                  <FiUsers className="w-5 h-5 text-[#4A1A45] group-hover:scale-110 transition-transform" />
                  <div>
                    <h4 className="font-bold text-xs text-black">Export Users Directory</h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{users.length} total registered accounts</p>
                  </div>
                </button>

                <button
                  onClick={() =>
                    downloadCSV(
                      "courses-catalog.csv",
                      ["Course ID", "Course Title", "Category", "Faculty", "Department", "Price", "Published", "Instructor"],
                      courses.map((c) => [c.id, c.title, c.category, c.faculty || "", c.department || "", c.price, c.published ? "Yes" : "No", c.tutor.name])
                    )
                  }
                  className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-black transition-all text-left space-y-2 group shadow-xs"
                >
                  <FiBookOpen className="w-5 h-5 text-[#4A1A45] group-hover:scale-110 transition-transform" />
                  <div>
                    <h4 className="font-bold text-xs text-black">Export Courses Catalog</h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{courses.length} curriculum tracks</p>
                  </div>
                </button>

                <button
                  onClick={() =>
                    downloadCSV(
                      "enrollments-audit.csv",
                      ["Enrollment ID", "Student Name", "Student Email", "Course Title", "Status", "Enrolled Date", "Completed Date"],
                      enrollments.map((e) => [e.id, e.student.name, e.student.email, e.course.title, e.status, String(e.enrolledAt), String(e.completedAt || "")])
                    )
                  }
                  className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-black transition-all text-left space-y-2 group shadow-xs"
                >
                  <FiAward className="w-5 h-5 text-[#4A1A45] group-hover:scale-110 transition-transform" />
                  <div>
                    <h4 className="font-bold text-xs text-black">Export Enrollments Ledger</h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{enrollments.length} student registrations</p>
                  </div>
                </button>

                <button
                  onClick={() =>
                    downloadCSV(
                      "submissions-gradebook.csv",
                      ["Submission ID", "Student Name", "Course Title", "Assignment Title", "Score", "Max Score", "Status", "Submitted Date"],
                      submissions.map((s) => [s.id, s.student.name, s.assignment.lesson.module.course.title, s.assignment.title, s.score ?? "Pending", s.assignment.maxScore, s.status, String(s.submittedAt)])
                    )
                  }
                  className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-black transition-all text-left space-y-2 group shadow-xs"
                >
                  <FiActivity className="w-5 h-5 text-[#4A1A45] group-hover:scale-110 transition-transform" />
                  <div>
                    <h4 className="font-bold text-xs text-black">Export Submissions Ledger</h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{submissions.length} evaluated tasks</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
