// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin",
}));

import { AdminDashboardClient } from "@/app/admin/AdminDashboardClient";

/* ───────── fixtures ───────── */
const recent = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

const users = () => [
  { id: "admin_1", name: "Boss Admin", email: "boss@test.com", role: "ADMIN", faculty: null, department: null, phone: null, lastLoginAt: recent(0), emailVerified: true, createdAt: recent(40), _count: { enrollments: 0, submissions: 0, courses: 0 } },
  { id: "stu_1", name: "Ada Student", email: "ada@test.com", role: "STUDENT", faculty: "Science", department: "Chemistry", phone: "08031234567", lastLoginAt: recent(2), emailVerified: false, createdAt: recent(3), _count: { enrollments: 1, submissions: 2, courses: 0 } },
  { id: "tut_1", name: "Dr Tutor", email: "tutor@test.com", role: "TUTOR", faculty: null, department: null, phone: null, lastLoginAt: null, emailVerified: true, createdAt: recent(10), _count: { enrollments: 0, submissions: 0, courses: 2 } },
];
const courses = () => [
  { id: "c1", title: "Biology 101", price: 15000, category: "Science", faculty: "Science", department: "Chemistry", level: "Beginner", published: true, createdAt: recent(5), tutor: { id: "tut_1", name: "Dr Tutor", email: "tutor@test.com" }, _count: { modules: 2, enrollments: 1, announcements: 0 }, modules: [{ _count: { lessons: 3 } }] },
  { id: "c2", title: "Physics Draft", price: 0, category: "Science", faculty: null, department: null, level: "Beginner", published: false, createdAt: recent(4), tutor: { id: "tut_1", name: "Dr Tutor", email: "tutor@test.com" }, _count: { modules: 1, enrollments: 0, announcements: 0 }, modules: [] },
];
const enrollments = () => [
  { id: "e1", status: "ACTIVE", enrolledAt: recent(2), completedAt: null, student: { id: "stu_1", name: "Ada Student", email: "ada@test.com" }, course: { id: "c1", title: "Biology 101", price: 15000, category: "Science" } },
  { id: "e2", status: "COMPLETED", enrolledAt: recent(20), completedAt: recent(1), student: { id: "stu_2", name: "Old Student", email: "old@test.com" }, course: { id: "c1", title: "Biology 101", price: 15000, category: "Science" } },
];
const submissions = () => [
  { id: "s1", content: "Plants make food.", score: 60, aiFeedback: "ok", tutorFeedback: null, status: "GRADED", submittedAt: recent(1), student: { id: "stu_1", name: "Ada Student", email: "ada@test.com" }, assignment: { id: "a1", title: "Quiz 1", maxScore: 100, lesson: { module: { course: { id: "c1", title: "Biology 101" } } } } },
];
const messages = () => [
  { id: "m1", name: "Visitor One", email: "visitor@test.com", subject: "Enrollment & Account Access", message: "I cannot see my course.", status: "NEW", createdAt: recent(0) },
  { id: "m2", name: "Prospect Tutor", email: "prospect@test.com", subject: "Teaching on Academia", message: "I would like to teach chemistry.", status: "READ", createdAt: recent(2) },
];

function dashboard(over: Partial<React.ComponentProps<typeof AdminDashboardClient>> = {}) {
  return render(
    <AdminDashboardClient
      currentUser={{ id: "admin_1", name: "Boss Admin", email: "boss@test.com", role: "ADMIN" }}
      initialUsers={users() as any}
      initialCourses={courses() as any}
      initialEnrollments={enrollments() as any}
      initialSubmissions={submissions() as any}
      initialMessages={messages() as any}
      metrics={{ totalUsers: 3, totalStudents: 1, totalTutors: 1, totalCourses: 2, publishedCourses: 1, totalEnrollments: 2, activeEnrollmentsCount: 1, completedEnrollmentsCount: 1, totalSubmissions: 1, totalRevenue: 30000 }}
      {...over}
    />
  );
}

type Reply = { ok?: boolean; status?: number; body: unknown };
function mockFetch(...replies: Reply[]) {
  const queue = [...replies];
  const fn = vi.fn(async (_url?: unknown, _init?: RequestInit) => {
    const r = queue.length > 1 ? queue.shift()! : queue[0];
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.body } as Response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}
const call = (fn: { mock: { calls: any[][] } }, i = -1) => {
  const [url, init] = fn.mock.calls.at(i)!;
  return { url: String(url), method: (init as RequestInit | undefined)?.method ?? "GET", body: (init as RequestInit | undefined)?.body ? JSON.parse((init as RequestInit).body as string) : undefined };
};
const goTo = (label: RegExp) => fireEvent.click(screen.getByRole("button", { name: label }));
const row = (text: string) => screen.getByText(text).closest("tr") as HTMLElement;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => cleanup());

/* ───────────────────────────── navigation & overview ───────────────────────────── */
describe("Admin dashboard: overview and navigation", () => {
  it("opens on the overview with real totals and the sign-up chart", () => {
    dashboard();
    expect(screen.getByText("Platform Performance Overview")).toBeTruthy();
    expect(screen.getByText("New Accounts, Last 30 Days")).toBeTruthy();
    expect(screen.getByText(/Revenue:/).textContent).toMatch(/30,000/);
    expect(screen.getByText("Total Accounts")).toBeTruthy();
  });

  it("honours the requested starting tab", () => {
    dashboard({ initialTab: "messages" });
    expect(screen.getByText("Visitor One")).toBeTruthy();
  });

  it("shows an unread badge on the Inbox tab", () => {
    dashboard();
    const inbox = screen.getByRole("button", { name: /Inbox/ });
    expect(within(inbox).getByText("1")).toBeTruthy(); // only m1 is NEW
  });

  it("logs out through the API and returns to /login", async () => {
    const fetchFn = mockFetch({ body: { success: true } });
    const loc = { href: "" };
    vi.stubGlobal("location", loc);
    dashboard();
    fireEvent.click(screen.getByRole("button", { name: /Log out/ }));
    await waitFor(() => expect(loc.href).toBe("/login"));
    expect(call(fetchFn).url).toBe("/api/auth/logout");
  });
});

/* ───────────────────────────── users ───────────────────────────── */
describe("Admin dashboard: users", () => {
  beforeEach(() => {
    dashboard({ initialTab: "users" });
  });

  it("lists everyone with email, phone, verification state and last login", () => {
    const ada = row("Ada Student");
    expect(within(ada).getByText(/ada@test\.com/)).toBeTruthy();
    expect(within(ada).getByText("(unverified)")).toBeTruthy();
    expect(within(ada).getByText("08031234567")).toBeTruthy();
    expect(within(row("Dr Tutor")).getByText(/Last login: never/)).toBeTruthy();
  });

  it("links each user to their full profile page", () => {
    const link = within(row("Ada Student")).getByText("View");
    expect(link.getAttribute("href")).toBe("/admin/users/stu_1");
  });

  it("searches by name or email", () => {
    fireEvent.change(screen.getByPlaceholderText(/Search users/), { target: { value: "tutor@test" } });
    expect(screen.queryByText("Ada Student")).toBeNull();
    expect(screen.getByText("Dr Tutor")).toBeTruthy();
  });

  it("filters by role, with counts taken from the live list", () => {
    const select = screen.getAllByRole("combobox")[0] as HTMLSelectElement;
    expect(within(select).getByText("Students (1)")).toBeTruthy();
    expect(within(select).getByText("Instructors (1)")).toBeTruthy();
    fireEvent.change(select, { target: { value: "TUTOR" } });
    expect(screen.queryByText("Ada Student")).toBeNull();
    expect(screen.getByText("Dr Tutor")).toBeTruthy();
  });

  it("does not offer to delete your own account", () => {
    expect(within(row("Boss Admin")).queryByTitle("Delete user")).toBeNull();
    expect(within(row("Ada Student")).getByTitle("Delete user")).toBeTruthy();
  });

  describe("adding an instructor", () => {
    const open = () => fireEvent.click(screen.getByRole("button", { name: /Add instructor/ }));
    const fill = (name = "Dr. Ade", email = "ade@test.com") => {
      const form = document.querySelector("form")!;
      fireEvent.change(form.querySelector('input:not([type="email"])')!, { target: { value: name } });
      fireEvent.change(form.querySelector('input[type="email"]')!, { target: { value: email } });
    };

    it("explains that they set their own password by email", () => {
      open();
      expect(screen.getByText(/email them a link to set their own password/i)).toBeTruthy();
    });

    it("sends the details, shows the new instructor and reports that the invite was emailed", async () => {
      const fetchFn = mockFetch({ body: { success: true, created: true, emailSent: true, user: { id: "tut_2", name: "Dr. Ade", email: "ade@test.com", role: "TUTOR", faculty: null, department: null, createdAt: recent(0), emailVerified: true } } });
      open();
      fill();
      fireEvent.submit(document.querySelector("form")!);
      expect(await screen.findByText(/invite to set a password was emailed to ade@test\.com/)).toBeTruthy();
      expect(call(fetchFn)).toEqual({ url: "/api/admin/users", method: "POST", body: { name: "Dr. Ade", email: "ade@test.com", faculty: "", department: "" } });
      expect(screen.getByText("Dr. Ade")).toBeTruthy();
      expect(screen.queryByText(/email them a link/i)).toBeNull(); // modal closed
    });

    it("warns when the invite email could not be sent", async () => {
      mockFetch({ body: { success: true, created: true, emailSent: false, user: { id: "tut_3", name: "Dr. X", email: "x@test.com", role: "TUTOR", createdAt: recent(0) } } });
      open();
      fill("Dr. X", "x@test.com");
      fireEvent.submit(document.querySelector("form")!);
      expect(await screen.findByText(/invite email could not be sent/)).toBeTruthy();
    });

    it("promotes an existing student instead of adding a duplicate row", async () => {
      mockFetch({ body: { success: true, created: false, user: { id: "stu_1", name: "Ada Student", email: "ada@test.com", role: "TUTOR", faculty: "Science", department: "Chemistry" } } });
      open();
      fill("Ada Student", "ada@test.com");
      fireEvent.submit(document.querySelector("form")!);
      expect(await screen.findByText(/Ada Student is now an instructor/)).toBeTruthy();
      expect(screen.getAllByText("Ada Student")).toHaveLength(1);
    });

    it("keeps the dialog open and shows the server's reason on failure", async () => {
      mockFetch({ ok: false, status: 409, body: { error: "This person is already an instructor." } });
      open();
      fill("Dr Tutor", "tutor@test.com");
      fireEvent.submit(document.querySelector("form")!);
      expect(await screen.findByText("This person is already an instructor.")).toBeTruthy();
      expect(screen.getByText(/email them a link/i)).toBeTruthy();
    });
  });

  describe("editing a user", () => {
    it("changes the role and saves only what was changed", async () => {
      const fetchFn = mockFetch({ body: { user: { id: "stu_1", role: "TUTOR", faculty: "Science", department: "Chemistry" } } });
      fireEvent.click(within(row("Ada Student")).getByTitle("Edit user role / password"));
      fireEvent.click(screen.getByRole("button", { name: "TUTOR" }));
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
      expect(await screen.findByText("User updated successfully.")).toBeTruthy();
      const sent = call(fetchFn);
      expect(sent).toMatchObject({ url: "/api/admin/users", method: "PATCH" });
      expect(sent.body).toMatchObject({ userId: "stu_1", role: "TUTOR" });
      expect(sent.body).not.toHaveProperty("newPassword");
    });

    it("includes a new password only when one is typed, and blocks one that is too short", async () => {
      const fetchFn = mockFetch({ body: { user: { id: "stu_1", role: "STUDENT", faculty: "Science", department: "Chemistry" } } });
      fireEvent.click(within(row("Ada Student")).getByTitle("Edit user role / password"));
      const pw = screen.getByPlaceholderText("Leave blank to preserve current");
      fireEvent.change(pw, { target: { value: "123" } });
      expect(screen.getByText("Min 6 characters required.")).toBeTruthy();
      expect((screen.getByRole("button", { name: "Save Changes" }) as HTMLButtonElement).disabled).toBe(true);

      fireEvent.change(pw, { target: { value: "fresh-pass-1" } });
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
      await screen.findByText("User updated successfully.");
      expect(call(fetchFn).body.newPassword).toBe("fresh-pass-1");
    });

    it("stops admins demoting themselves in the dialog", () => {
      fireEvent.click(within(row("Boss Admin")).getByTitle("Edit user role / password"));
      expect(screen.getByText("You cannot change your own admin role.")).toBeTruthy();
    });
  });

  describe("deleting a user", () => {
    it("asks for confirmation, then deletes and removes the row", async () => {
      const fetchFn = mockFetch({ body: { success: true } });
      fireEvent.click(within(row("Ada Student")).getByTitle("Delete user"));
      expect(screen.getByText("Delete User: Ada Student?")).toBeTruthy();
      expect(fetchFn).not.toHaveBeenCalled(); // nothing happens until confirmed
      fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));
      expect(await screen.findByText("User account removed.")).toBeTruthy();
      expect(call(fetchFn)).toMatchObject({ url: "/api/admin/users?id=stu_1", method: "DELETE" });
      expect(screen.queryByText("Ada Student")).toBeNull();
    });

    it("cancelling changes nothing", () => {
      const fetchFn = mockFetch({ body: {} });
      fireEvent.click(within(row("Ada Student")).getByTitle("Delete user"));
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(fetchFn).not.toHaveBeenCalled();
      expect(screen.getByText("Ada Student")).toBeTruthy();
    });

    it("keeps the row and shows the error when the server refuses", async () => {
      mockFetch({ ok: false, status: 403, body: { error: "Admin access required." } });
      fireEvent.click(within(row("Ada Student")).getByTitle("Delete user"));
      fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));
      expect(await screen.findByText("Admin access required.")).toBeTruthy();
      expect(screen.getByText("Ada Student")).toBeTruthy();
    });
  });
});

/* ───────────────────────────── courses ───────────────────────────── */
describe("Admin dashboard: courses", () => {
  beforeEach(() => {
    dashboard({ initialTab: "courses" });
  });
  const card = (title: string) => screen.getByText(title).closest("div.bg-white") as HTMLElement;

  it("shows published and draft state", () => {
    expect(within(card("Biology 101")).getByText("Published")).toBeTruthy();
    expect(within(card("Physics Draft")).getByText("Draft")).toBeTruthy();
  });

  it("publishes and unpublishes through the API and updates the label", async () => {
    const fetchFn = mockFetch({ body: { course: { id: "c2", title: "Physics Draft", published: true } } });
    fireEvent.click(within(card("Physics Draft")).getByText("Draft"));
    expect(await screen.findByText("Course published.")).toBeTruthy();
    expect(call(fetchFn)).toEqual({ url: "/api/admin/courses", method: "PATCH", body: { courseId: "c2", published: true } });
    expect(within(card("Physics Draft")).getByText("Published")).toBeTruthy();
  });

  it("deletes a course only after confirmation", async () => {
    const fetchFn = mockFetch({ body: { success: true } });
    const buttons = within(card("Physics Draft")).getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]); // trash icon
    expect(screen.getByText("Delete Course: Physics Draft?")).toBeTruthy();
    expect(fetchFn).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));
    expect(await screen.findByText("Course deleted permanently.")).toBeTruthy();
    expect(call(fetchFn)).toMatchObject({ url: "/api/admin/courses?id=c2", method: "DELETE" });
    expect(screen.queryByText("Physics Draft")).toBeNull();
  });

  it("searches courses by title", () => {
    fireEvent.change(screen.getByPlaceholderText(/Search courses/), { target: { value: "physics" } });
    expect(screen.queryByText("Biology 101")).toBeNull();
    expect(screen.getByText("Physics Draft")).toBeTruthy();
  });
});

/* ───────────────────────────── enrollments & grades ───────────────────────────── */
describe("Admin dashboard: enrollments and grades", () => {
  it("only active enrollments can be revoked, and revoking asks first and releases the lock", async () => {
    dashboard({ initialTab: "enrollments" });
    expect(within(row("Old Student")).queryByText(/Revoke Lock/)).toBeNull(); // completed: keep the certificate
    const fetchFn = mockFetch({ body: { success: true } });
    fireEvent.click(within(row("Ada Student")).getByText(/Revoke Lock/));
    expect(screen.getByText("Revoke Enrollment: Ada Student?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));
    expect(await screen.findByText(/revoked and unlocked/)).toBeTruthy();
    expect(call(fetchFn)).toMatchObject({ url: "/api/admin/enrollments?id=e1", method: "DELETE" });
    expect(screen.queryByText("Ada Student")).toBeNull();
  });

  it("overrides a grade with a score and a reason", async () => {
    dashboard({ initialTab: "submissions" });
    const fetchFn = mockFetch({ body: { success: true } });
    expect(screen.getByText("60 / 100")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Override/ }));
    expect(screen.getByText("Grade Override Desk")).toBeTruthy();
    fireEvent.change(document.querySelector('input[type="range"]')!, { target: { value: "85" } });
    fireEvent.change(screen.getByPlaceholderText(/Reason for this grade adjustment/), { target: { value: "Regraded after review" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply Override" }));
    expect(await screen.findByText("Grade override successfully applied.")).toBeTruthy();
    expect(call(fetchFn)).toEqual({ url: "/api/tutor/grade-override", method: "POST", body: { submissionId: "s1", newScore: 85, tutorFeedback: "Regraded after review" } });
    expect(screen.getByText("85 / 100")).toBeTruthy();
  });
});

/* ───────────────────────────── inbox ───────────────────────────── */
describe("Admin dashboard: contact inbox", () => {
  beforeEach(() => {
    dashboard({ initialTab: "messages" });
  });
  const msg = (name: string) => screen.getByText(name).closest("div.bg-white") as HTMLElement;

  it("shows every message with its topic, sender and text", () => {
    expect(screen.getByText("Enrollment & Account Access")).toBeTruthy();
    expect(screen.getByText("I cannot see my course.")).toBeTruthy();
    expect(screen.getByText("Teaching on Academia")).toBeTruthy();
    expect(within(msg("Visitor One")).getByText("New")).toBeTruthy();
    expect(within(msg("Prospect Tutor")).queryByText("New")).toBeNull();
  });

  it("filters to unread only", () => {
    fireEvent.click(screen.getByRole("button", { name: /Unread \(1\)/ }));
    expect(screen.getByText("Visitor One")).toBeTruthy();
    expect(screen.queryByText("Prospect Tutor")).toBeNull();
  });

  it("replying opens the user's email app with the topic as subject, and marks the message read", async () => {
    const fetchFn = mockFetch({ body: { success: true } });
    const reply = within(msg("Visitor One")).getByText("Reply").closest("a")!;
    expect(reply.getAttribute("href")).toBe(`mailto:visitor@test.com?subject=${encodeURIComponent("Re: Enrollment & Account Access")}`);
    fireEvent.click(reply);
    await waitFor(() => expect(within(msg("Visitor One")).queryByText("New")).toBeNull());
    expect(call(fetchFn)).toEqual({ url: "/api/admin/contact-messages", method: "PATCH", body: { id: "m1", status: "READ" } });
  });

  it("toggles read and unread", async () => {
    const fetchFn = mockFetch({ body: { success: true } });
    fireEvent.click(within(msg("Prospect Tutor")).getByText("Mark unread"));
    await waitFor(() => expect(within(msg("Prospect Tutor")).getByText("New")).toBeTruthy());
    expect(call(fetchFn).body).toEqual({ id: "m2", status: "NEW" });
  });

  it("deletes a message", async () => {
    const fetchFn = mockFetch({ body: { success: true } });
    fireEvent.click(within(msg("Prospect Tutor")).getByLabelText("Delete message"));
    expect(await screen.findByText("Message deleted.")).toBeTruthy();
    expect(call(fetchFn)).toMatchObject({ url: "/api/admin/contact-messages?id=m2", method: "DELETE" });
    expect(screen.queryByText("Prospect Tutor")).toBeNull();
  });

  it("leaves the message alone and reports the error when the server fails", async () => {
    mockFetch({ ok: false, status: 500, body: { error: "Failed to delete message." } });
    fireEvent.click(within(msg("Prospect Tutor")).getByLabelText("Delete message"));
    expect(await screen.findByText("Failed to delete message.")).toBeTruthy();
    expect(screen.getByText("Prospect Tutor")).toBeTruthy();
  });

  it("shows friendly empty states", () => {
    cleanup();
    dashboard({ initialTab: "messages", initialMessages: [] });
    expect(screen.getByText("No messages yet.")).toBeTruthy();
  });
});

/* ───────────────────────────── settings & export ───────────────────────────── */
describe("Admin dashboard: settings and CSV export", () => {
  it("changing your password needs the current one and a confirmed new one", async () => {
    dashboard({ initialTab: "settings" });
    const fetchFn = mockFetch({ body: { success: true } });
    const submit = () => fireEvent.click(screen.getByRole("button", { name: "Save New Password" }));

    fireEvent.change(screen.getByPlaceholderText("Minimum 6 characters"), { target: { value: "brand-new-1" } });
    submit();
    expect(await screen.findByText("Enter your current password.")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Enter your current password"), { target: { value: "old-pass" } });
    fireEvent.change(screen.getByPlaceholderText("Re-enter password"), { target: { value: "different" } });
    submit();
    expect(await screen.findByText("Passwords do not match.")).toBeTruthy();
    expect(fetchFn).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("Re-enter password"), { target: { value: "brand-new-1" } });
    submit();
    expect(await screen.findByText(/password updated successfully/i)).toBeTruthy();
    expect(call(fetchFn)).toEqual({ url: "/api/student/profile", method: "POST", body: { name: "Boss Admin", password: "brand-new-1", currentPassword: "old-pass" } });
  });

  describe("users export", () => {
    let blobText = "";
    beforeEach(() => {
      blobText = "";
      vi.stubGlobal(
        "Blob",
        class extends Blob {
          constructor(parts: BlobPart[], opts?: BlobPropertyBag) {
            super(parts, opts);
            blobText = String(parts[0]);
          }
        }
      );
      (URL as any).createObjectURL = vi.fn(() => "blob:test");
      (URL as any).revokeObjectURL = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    });

    const exportUsers = () => {
      cleanup();
      return dashboard({ initialTab: "settings" });
    };

    it("downloads a CSV with the new columns, a BOM for Excel, and the right file name", () => {
      exportUsers();
      const anchors: HTMLAnchorElement[] = [];
      const orig = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag: string, o?: any) => {
        const el = orig(tag, o);
        if (tag === "a") anchors.push(el as HTMLAnchorElement);
        return el;
      });
      fireEvent.click(screen.getByText("Export Users Directory").closest("button")!);
      expect(blobText.startsWith("﻿")).toBe(true);
      expect(blobText.split("\n")[0]).toBe("﻿User ID,Full Name,Email,Email Verified,Phone,Role,Faculty,Department,Registered Date,Last Login");
      expect(blobText).toContain("ada@test.com");
      expect(blobText).toContain("08031234567");
      expect(anchors[0].getAttribute("download")).toBe("users-directory.csv");
    });

    it("neutralises spreadsheet formulas hidden in names (CSV injection)", () => {
      const evil = users();
      evil[1].name = '=HYPERLINK("http://evil.example","click")';
      evil[2].name = "+cmd|' /C calc'!A0";
      cleanup();
      dashboard({ initialTab: "settings", initialUsers: evil as any });
      fireEvent.click(screen.getByText("Export Users Directory").closest("button")!);
      expect(blobText).toContain(`"'=HYPERLINK(""http://evil.example"",""click"")"`);
      expect(blobText).toContain(`"'+cmd|' /C calc'!A0"`);
      expect(blobText).not.toMatch(/(^|,)"=HYPERLINK/m);
    });

    it("handles names containing # and quotes without corrupting the file", () => {
      const odd = users();
      odd[1].name = 'Ada "The Great" #1';
      cleanup();
      dashboard({ initialTab: "settings", initialUsers: odd as any });
      fireEvent.click(screen.getByText("Export Users Directory").closest("button")!);
      expect(blobText).toContain('"Ada ""The Great"" #1"');
    });
  });
});
