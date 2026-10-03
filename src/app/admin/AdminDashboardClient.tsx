"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
  FiShield, FiUsers, FiBookOpen, FiAward, FiDollarSign,
  FiCheckCircle, FiClock, FiTrash2, FiEdit2, FiLogOut,
  FiSearch, FiAlertCircle, FiX, FiActivity,
  FiToggleLeft, FiToggleRight, FiBarChart2, FiSliders,
  FiFilter, FiLayers, FiFileText, FiPlus, FiDownload,
  FiCompass,
} from "react-icons/fi";

import { ACADEMIC_STRUCTURE, getDepartmentsForFaculty } from "@/lib/academicStructure";

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
interface Props {
  currentUser: { id: string; name: string; email: string; role: string };
  initialUsers: UserItem[];
  initialCourses: CourseItem[];
  initialEnrollments: EnrollmentItem[];
  initialSubmissions: SubmissionItem[];
  metrics: Metrics;
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
                      ? "bg-black text-white border-black"
                      : "bg-white text-neutral-600 border-neutral-300 hover:border-black"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {user.id === currentAdminId && (
              <p className="text-[10px] text-[#784D28] font-bold mt-1">You cannot change your own admin role.</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">Faculty / School</label>
            <select
              value={faculty}
              onChange={(e) => handleFacultyChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-black outline-none focus:border-black"
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
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-black outline-none focus:border-black"
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
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black outline-none focus:border-black"
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
          <p className="text-[10px] font-bold text-[#784D28] uppercase">{sub.assignment.lesson.module.course.title}</p>
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
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black outline-none focus:border-black"
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
  currentUser, initialUsers, initialCourses, initialEnrollments, initialSubmissions, metrics,
}: Props) {
  const { toasts, success, error } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "courses" | "enrollments" | "submissions">("overview");

  const [users, setUsers] = useState(initialUsers);
  const [courses, setCourses] = useState(initialCourses);
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [submissions, setSubmissions] = useState(initialSubmissions);

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [userDeptFilter, setUserDeptFilter] = useState("ALL");
  const [courseSearch, setCourseSearch] = useState("");
  const [coursePublishedFilter, setCoursePublishedFilter] = useState("ALL");
  const [courseDeptFilter, setCourseDeptFilter] = useState("ALL");

  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null);
  const [deleteCourse, setDeleteCourse] = useState<CourseItem | null>(null);
  const [gradeOverrideSub, setGradeOverrideSub] = useState<SubmissionItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-black">
              <span className="font-black text-xl text-black">A</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white">Academia</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-[#D4A373] border border-neutral-700">
                  Superadmin
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">System Command &amp; Analytics Console</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/courses"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-800 bg-neutral-900 text-xs font-bold text-neutral-300 hover:text-white hover:border-neutral-700 transition-all"
            >
              <FiBookOpen className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>Student Catalog</span>
            </Link>
            <Link
              href="/instructor"
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-800 bg-neutral-900 text-xs font-bold text-neutral-300 hover:text-white hover:border-neutral-700 transition-all"
            >
              <FiLayers className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>Instructor Studio</span>
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-colors shadow-sm"
              >
                <FiLogOut className="w-3.5 h-3.5 text-neutral-700" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </form>
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
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                  active
                    ? "bg-white text-black shadow-sm font-bold"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    active ? "bg-black text-white" : "bg-neutral-800 text-neutral-300"
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
                background: "linear-gradient(115deg, #000000 0%, #141414 55%, #3B2412 85%, #784D28 100%)",
              }}
            >
              <div className="max-w-xl space-y-2 relative">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4A373]">System Intelligence</span>
                <h2 className="font-bold text-3xl">Platform Performance Overview</h2>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Real-time analytics covering platform enrollments, revenue, completion ratios, and assignment throughput.
                </p>
                <div className="pt-3 flex items-center gap-4 text-xs">
                  <span className="px-4 py-2 rounded-full bg-white text-black font-bold">
                    Revenue: ${metrics.totalRevenue.toFixed(2)}
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
                { label: "Total Accounts", value: metrics.totalUsers, sub: `${metrics.totalStudents} students · ${metrics.totalTutors} instructors`, trend: "Active directory" },
                { label: "Published Courses", value: `${metrics.publishedCourses} / ${metrics.totalCourses}`, sub: "Live in catalog", trend: "Curriculum status" },
                { label: "Active Enrollments", value: metrics.activeEnrollmentsCount, sub: `${metrics.completedEnrollmentsCount} completed`, trend: "1:1 active lock" },
                { label: "Submissions Logged", value: metrics.totalSubmissions, sub: "AI & faculty reviews", trend: "AI verified" },
              ].map((c, i) => (
                <div key={i} className="bg-neutral-950 text-white rounded-3xl p-6 border border-neutral-800 shadow-md flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-all">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-400 font-semibold tracking-wide uppercase">{c.label}</p>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#D4A373] bg-neutral-900 border border-neutral-800">
                      {c.trend}
                    </span>
                  </div>
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
              <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                  <div>
                    <h3 className="font-bold text-base text-black">Enrollment Throughput by Academic Track</h3>
                    <p className="text-xs text-neutral-500">Live active enrollments vs certified completion milestones</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-neutral-700">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-black inline-block" />
                      <span>Active Students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#784D28] inline-block" />
                      <span>Certified (70%+)</span>
                    </div>
                  </div>
                </div>

                {/* Summary Throughput Ribbon */}
                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Active Cohorts</span>
                    <span className="text-base font-black text-black">{metrics.activeEnrollmentsCount} active</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Certifications</span>
                    <span className="text-base font-black text-[#784D28]">{metrics.completedEnrollmentsCount} completed</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Track Completion</span>
                    <span className="text-base font-black text-neutral-800">
                      {metrics.activeEnrollmentsCount + metrics.completedEnrollmentsCount > 0
                        ? Math.round((metrics.completedEnrollmentsCount / (metrics.activeEnrollmentsCount + metrics.completedEnrollmentsCount)) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>

                {/* Dynamically Computed Category Throughput with Direct Visible Numbers */}
                {(() => {
                  const categoriesMap = new Map<string, { active: number; comp: number }>();
                  courses.forEach((c) => {
                    const cat = c.category || "General";
                    if (!categoriesMap.has(cat)) categoriesMap.set(cat, { active: 0, comp: 0 });
                  });
                  enrollments.forEach((e) => {
                    const cat = e.course?.category || "General";
                    if (!categoriesMap.has(cat)) categoriesMap.set(cat, { active: 0, comp: 0 });
                    const item = categoriesMap.get(cat)!;
                    if (e.status === "ACTIVE") item.active += 1;
                    else if (e.status === "COMPLETED") item.comp += 1;
                  });

                  const bars = Array.from(categoriesMap.entries()).slice(0, 6).map(([cat, data]) => {
                    const activeH = Math.max(25, Math.min(95, data.active * 35 + 25));
                    const compH = Math.max(20, Math.min(90, data.comp * 35 + 20));
                    return {
                      cat,
                      active: activeH,
                      comp: compH,
                      rawActive: data.active,
                      rawComp: data.comp,
                    };
                  });

                  const displayBars = bars.length > 0 ? bars : [
                    { cat: "Engineering", active: 75, comp: 60, rawActive: 1, rawComp: 0 }
                  ];

                  return (
                    <div className="relative pt-2">
                      {/* Horizontal Reference Lines */}
                      <div className="absolute inset-x-2 top-2 bottom-8 flex flex-col justify-between pointer-events-none z-0">
                        <div className="border-b border-dashed border-neutral-200 w-full flex items-center justify-end pr-1">
                          <span className="text-[9px] font-mono text-neutral-400">Peak</span>
                        </div>
                        <div className="border-b border-dashed border-neutral-200 w-full flex items-center justify-end pr-1">
                          <span className="text-[9px] font-mono text-neutral-400">Mid</span>
                        </div>
                        <div className="border-b border-neutral-200 w-full flex items-center justify-end pr-1">
                          <span className="text-[9px] font-mono text-neutral-400">Baseline</span>
                        </div>
                      </div>

                      <div className="h-56 flex items-end justify-between gap-3 sm:gap-6 px-4 relative z-10">
                        {displayBars.map((b) => (
                          <div key={b.cat} className="flex-1 flex flex-col items-center gap-1.5">
                            {/* Visible Numbers Above Bars */}
                            <div className="flex items-center gap-1 text-[11px] font-bold">
                              <span className="text-black">{b.rawActive}</span>
                              <span className="text-neutral-300">/</span>
                              <span className="text-[#784D28]">{b.rawComp}</span>
                            </div>

                            <div className="w-full flex items-end justify-center gap-2 h-40 bg-neutral-50/70 rounded-2xl p-1.5 border border-neutral-100">
                              {/* Active Bar */}
                              <div className="w-3.5 sm:w-5 flex flex-col justify-end h-full">
                                <div
                                  className="w-full rounded-t-md bg-black transition-all duration-500 hover:brightness-125"
                                  style={{ height: `${b.active}%` }}
                                  title={`${b.rawActive} active`}
                                />
                              </div>
                              {/* Completed Bar */}
                              <div className="w-3.5 sm:w-5 flex flex-col justify-end h-full">
                                <div
                                  className="w-full rounded-t-md bg-[#784D28] transition-all duration-500 hover:brightness-125"
                                  style={{ height: `${b.comp}%` }}
                                  title={`${b.rawComp} certified`}
                                />
                              </div>
                            </div>
                            <span className="text-xs font-bold text-neutral-800 truncate max-w-[100px] text-center">{b.cat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Platform Composition Breakdown */}
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6 flex flex-col justify-between">
                <div className="pb-3 border-b border-neutral-100">
                  <h3 className="font-bold text-base text-black">Platform Composition</h3>
                  <p className="text-xs text-neutral-500">Distribution across active system accounts</p>
                </div>

                {/* SVG Ring Chart (Computed from users props) */}
                {(() => {
                  const total = users.length || 1;
                  const sCount = users.filter((u) => u.role === "STUDENT").length;
                  const tCount = users.filter((u) => u.role === "TUTOR").length;
                  const aCount = users.filter((u) => u.role === "ADMIN").length;

                  const sPct = Math.round((sCount / total) * 100);
                  const tPct = Math.round((tCount / total) * 100);
                  const aPct = Math.max(0, 100 - sPct - tPct);

                  const dashS = Math.round((sPct / 100) * 239);
                  const dashT = Math.round((tPct / 100) * 239);
                  const dashA = Math.max(0, 239 - dashS - dashT);

                  return (
                    <>
                      <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
                          <circle cx="50" cy="50" r="38" stroke="#F4F4F5" strokeWidth="12" fill="none" />
                          {/* Students segment */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#000000"
                            strokeWidth="12"
                            strokeDasharray={`${dashS} 239`}
                            strokeDashoffset="0"
                            fill="none"
                          />
                          {/* Instructors segment */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#784D28"
                            strokeWidth="12"
                            strokeDasharray={`${dashT} 239`}
                            strokeDashoffset={`-${dashS}`}
                            fill="none"
                          />
                          {/* Admins segment */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#A1A1AA"
                            strokeWidth="12"
                            strokeDasharray={`${dashA} 239`}
                            strokeDashoffset={`-${dashS + dashT}`}
                            fill="none"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                          <span className="font-black text-3xl text-black">{total}</span>
                          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Total Accounts</span>
                        </div>
                      </div>

                      {/* Direct Breakdown Bars & Legend */}
                      <div className="space-y-3 pt-2 border-t border-neutral-100">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-black flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-black inline-block" />
                              Students ({sPct}%)
                            </span>
                            <span className="font-black text-black">{sCount}</span>
                          </div>
                          <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-black h-full rounded-full" style={{ width: `${sPct}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-black flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#784D28] inline-block" />
                              Faculty &amp; Tutors ({tPct}%)
                            </span>
                            <span className="font-black text-[#784D28]">{tCount}</span>
                          </div>
                          <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-[#784D28] h-full rounded-full" style={{ width: `${tPct}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-neutral-700 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block" />
                              Administrators ({aPct}%)
                            </span>
                            <span className="font-black text-neutral-700">{aCount}</span>
                          </div>
                          <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-neutral-400 h-full rounded-full" style={{ width: `${aPct}%` }} />
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
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-neutral-50 border border-neutral-200 text-xs text-black outline-none focus:border-black"
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
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-neutral-50 border border-neutral-200 text-xs text-black outline-none focus:border-black"
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
                        <span className="text-[10px] font-bold text-[#784D28] uppercase">{c.faculty || c.category} · {c.level}</span>
                      </div>
                      <span className="font-bold text-base text-black">${c.price.toFixed(2)}</span>
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
                      <p className="text-[#784D28] font-bold">{e.course.title}</p>
                      <p className="text-[10px] text-neutral-500">{e.course.department || e.course.category}</p>
                    </td>
                    <td className="p-4 font-bold text-black">${e.course.price.toFixed(2)}</td>
                    <td className="p-4 text-neutral-500">{formatDate(e.enrolledAt)}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black text-white">
                        {e.status}
                      </span>
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
                      <span className="text-[10px] font-bold text-[#784D28] uppercase">
                        {sub.assignment.lesson.module.course.title}
                      </span>
                      <h4 className="font-bold text-base text-black">{sub.assignment.title}</h4>
                      <p className="text-xs text-neutral-500">Student: <strong>{sub.student.name}</strong> · Submitted {formatDate(sub.submittedAt)}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase block">Grade</span>
                        <span className={`font-bold text-xl ${isPass ? "text-black" : "text-[#784D28]"}`}>
                          {sub.score !== null ? `${sub.score} / ${max}` : "Pending"}
                        </span>
                      </div>
                      <button
                        onClick={() => setGradeOverrideSub(sub)}
                        className="px-4 py-2 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
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
      </main>
    </div>
  );
}
