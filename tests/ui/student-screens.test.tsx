// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

import { ProfileClient } from "@/app/profile/ProfileClient";
import { CatalogClient } from "@/app/CatalogClient";
import { Navbar } from "@/components/ui/Navbar";
import { CourseEnrollmentAction } from "@/components/course/CourseEnrollmentAction";

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
const sent = (fn: { mock: { calls: any[][] } }) => {
  const [url, init] = fn.mock.calls.at(-1)!;
  return { url: String(url), method: (init as RequestInit | undefined)?.method ?? "GET", body: typeof (init as RequestInit | undefined)?.body === "string" ? JSON.parse((init as RequestInit).body as string) : undefined };
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("location", { href: "", reload: vi.fn(), pathname: "/", search: "", hash: "" });
});
afterEach(() => cleanup());

const student = { id: "stu_1", name: "Ada Student", email: "ada@test.com", role: "STUDENT", faculty: "Business Studies", department: "Computer Science", phone: "08031234567", emailVerified: true };

/* ───────────────────────────── navbar ───────────────────────────── */
describe("Navbar", () => {
  it("offers sign in and sign up to visitors", () => {
    render(<Navbar currentUser={null} />);
    expect(screen.getAllByText("Sign In")[0].closest("a")!.getAttribute("href")).toBe("/login");
    expect(screen.getAllByText(/Sign Up|Join|Get Started/)[0].closest("a")!.getAttribute("href")).toBe("/signup");
  });

  it.each([
    ["STUDENT", "/my-courses"],
    ["TUTOR", "/instructor"],
    ["ADMIN", "/admin"],
    ["SUPERADMIN", "/admin"],
  ])("sends a %s to %s from the brand link", (role, home) => {
    render(<Navbar currentUser={{ ...student, role }} />);
    const brand = document.querySelector(`a[href="${home}"]`);
    expect(brand).toBeTruthy();
  });

  it("shows the signed-in user's name and role, and signs out through the API", async () => {
    const fetchFn = mockFetch({ body: { success: true } });
    render(<Navbar currentUser={student} />);
    expect(screen.getAllByText("Ada Student").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText("Ada Student")[0].closest("button")!); // open the user menu
    fireEvent.click(screen.getAllByText("Sign Out")[0].closest("button")!);
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());
    expect(sent(fetchFn)).toMatchObject({ url: "/api/auth/logout", method: "POST" });
  });

  it("gives students receipts and courses, and staff their own consoles", () => {
    const { unmount } = render(<Navbar currentUser={student} />);
    fireEvent.click(screen.getAllByText("Ada Student")[0].closest("button")!);
    expect(document.querySelector('a[href="/profile#receipts"]')).toBeTruthy();
    expect(document.querySelector('a[href="/my-courses"]')).toBeTruthy();
    unmount();
    render(<Navbar currentUser={{ ...student, role: "ADMIN" }} />);
    fireEvent.click(screen.getAllByText("Ada Student")[0].closest("button")!);
    expect(document.querySelector('a[href="/admin?tab=settings"]')).toBeTruthy();
  });
});

/* ───────────────────────────── catalog ───────────────────────────── */
describe("CatalogClient (course catalog)", () => {
  const catalog = () => [
    { id: "c1", title: "Intro to Programming", description: "Learn to code", level: "Beginner", price: 15000, faculty: "Business Studies", department: "Computer Science", tutor: { name: "Dr Ade" }, modules: [{ lessons: [{ id: "l1" }, { id: "l2" }] }] },
    { id: "c2", title: "Organic Chemistry", description: "Carbon compounds", level: "Advanced", price: 0, faculty: "Financial Studies", department: "Chemistry", tutor: { name: "Dr Bisi" }, modules: [{ lessons: [{ id: "l3" }] }] },
    { id: "c3", title: "Data Structures", description: "Trees and graphs", level: "Intermediate", price: 20000, faculty: "Business Studies", department: "Computer Science", tutor: { name: "Dr Ade" }, modules: [] },
  ];
  const view = (props: Partial<React.ComponentProps<typeof CatalogClient>> = {}) =>
    render(<CatalogClient currentUser={null} courses={catalog()} activeEnrollment={null} {...props} />);

  it("lists every course with its real price ('Free' for 0) and instructor", () => {
    view();
    expect(screen.getByText("Intro to Programming")).toBeTruthy();
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.getByText(/15,000/)).toBeTruthy();
    expect(screen.getAllByText("Instructor: Dr Ade")).toHaveLength(2);
    expect(screen.getByText(/2 lessons/)).toBeTruthy();
  });

  it("makes no inflated claims in its intro", () => {
    const { container } = view();
    expect(container.textContent).not.toMatch(/university-grade|accredited/i);
  });

  it("searches by title or description", () => {
    view();
    fireEvent.change(screen.getByPlaceholderText(/Search courses/), { target: { value: "carbon" } });
    expect(screen.queryByText("Intro to Programming")).toBeNull();
    expect(screen.getByText("Organic Chemistry")).toBeTruthy();
  });

  it("filters by level", () => {
    view();
    const level = screen.getAllByRole("combobox").find((s) => within(s).queryByText("All Levels"))!;
    fireEvent.change(level, { target: { value: "Advanced" } });
    expect(screen.getByText("Organic Chemistry")).toBeTruthy();
    expect(screen.queryByText("Data Structures")).toBeNull();
  });

  it("filters by school", () => {
    view();
    const school = screen.getAllByRole("combobox").find((s) => within(s).queryByText("All Schools"))!;
    fireEvent.change(school, { target: { value: "Business Studies" } });
    expect(screen.queryByText("Organic Chemistry")).toBeNull();
    expect(screen.getByText("Data Structures")).toBeTruthy();
  });

  it("says so when nothing matches", () => {
    view();
    fireEvent.change(screen.getByPlaceholderText(/Search courses/), { target: { value: "zzzzzz" } });
    expect(screen.getByText("No courses found matching criteria.")).toBeTruthy();
  });

  it("shows a student only courses from their own department", () => {
    view({ currentUser: student });
    expect(screen.getByText("Intro to Programming")).toBeTruthy();
    expect(screen.queryByText("Organic Chemistry")).toBeNull();
    expect(screen.getByPlaceholderText("Search Computer Science courses...")).toBeTruthy();
  });

  it("sends visitors to sign in instead of the checkout", () => {
    view();
    const loc = { href: "" };
    vi.stubGlobal("location", loc);
    fireEvent.click(screen.getAllByText("Sign In to Enroll")[0]);
    expect(loc.href).toBe("/login");
    expect(screen.queryByText("Course Checkout")).toBeNull();
  });

  it("opens the checkout for a signed-in student", () => {
    view({ currentUser: student });
    fireEvent.click(screen.getAllByText("Enroll in Course")[0]);
    expect(screen.getByText("Course Checkout")).toBeTruthy();
  });

  it("enforces the one-course rule visibly: other courses are locked, the active one says Continue", () => {
    view({ currentUser: student, activeEnrollment: { id: "e1", courseId: "c1", course: { id: "c1", title: "Intro to Programming" } } });
    expect(screen.getByText("Currently Registered")).toBeTruthy();
    expect(screen.getByText("Continue Learning").closest("a")!.getAttribute("href")).toBe("/student/courses/c1");
    expect(screen.getAllByText("Registration Locked").length).toBe(1); // c3: the only other course in their department
    expect((screen.getByText("Registration Locked").closest("button") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("Enroll in Course")).toBeNull();
  });

  it("every card links to a public syllabus page", () => {
    view();
    expect(screen.getAllByText("View Syllabus Details")[0].closest("a")!.getAttribute("href")).toBe("/courses/c1");
  });
});

/* ───────────────────────────── profile ───────────────────────────── */
describe("ProfileClient (student profile)", () => {
  const enrollments = () => [
    { id: "e1", status: "ACTIVE", enrolledAt: "2026-04-01T10:00:00Z", completedAt: null, course: { id: "c1", title: "Intro to Programming", price: 15000 } },
    { id: "e2", status: "COMPLETED", enrolledAt: "2026-02-01T10:00:00Z", completedAt: "2026-03-01T10:00:00Z", course: { id: "c0", title: "Basic Math", price: 5000 } },
  ];
  const payments = () => [
    { id: "p1", reference: "PP-CRS-ABC-1", amount: 15000, status: "SUCCESS", channel: "card", paidAt: "2026-04-01T10:00:00Z", createdAt: "2026-04-01T09:59:00Z", paystackRef: "998877", course: { title: "Intro to Programming" } },
    { id: "p2", reference: "PP-CRS-DEF-2", amount: 5000, status: "FAILED", channel: null, paidAt: null, createdAt: "2026-03-01T09:00:00Z", paystackRef: null, course: { title: "Basic Math" } },
  ];
  const submissions = () => [{ id: "s1", score: 80, status: "GRADED", submittedAt: "2026-04-05T10:00:00Z", assignment: { title: "Quiz 1", maxScore: 100 } }];
  const view = (over: Partial<React.ComponentProps<typeof ProfileClient>> = {}) =>
    render(<ProfileClient currentUser={student} enrollments={enrollments()} submissions={submissions()} payments={payments()} {...over} />);

  it("shows the student's identity and active course", () => {
    view();
    expect(screen.getAllByText("Ada Student").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ada@test.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Intro to Programming").length).toBeGreaterThan(0);
  });

  it("pre-fills the profile form, including the phone number", () => {
    view();
    expect((screen.getByDisplayValue("Ada Student") as HTMLInputElement).value).toBe("Ada Student");
    expect((screen.getByPlaceholderText("e.g. 0803 123 4567") as HTMLInputElement).value).toBe("08031234567");
    expect((screen.getByDisplayValue("ada@test.com") as HTMLInputElement).disabled).toBe(true); // email is the login: not editable here
  });

  describe("saving changes", () => {
    // Submit the form directly: real browsers also apply native required/minLength checks before this runs.
    const save = () => fireEvent.submit(screen.getByRole("button", { name: /Save/ }).closest("form")!);

    it("sends the edited name and phone", async () => {
      const fetchFn = mockFetch({ body: { success: true } });
      view();
      fireEvent.change(screen.getByDisplayValue("Ada Student"), { target: { value: "Ada Obi" } });
      fireEvent.change(screen.getByPlaceholderText("e.g. 0803 123 4567"), { target: { value: "0805 555 6666" } });
      save();
      await waitFor(() => expect(fetchFn).toHaveBeenCalled());
      expect(sent(fetchFn)).toMatchObject({ url: "/api/student/profile", method: "POST", body: { name: "Ada Obi", phone: "0805 555 6666" } });
      expect(sent(fetchFn).body.password).toBeUndefined();
    });

    it("changing the password requires the current password and a matching confirmation", async () => {
      const fetchFn = mockFetch({ body: { success: true } });
      view();
      fireEvent.change(screen.getByPlaceholderText("Minimum 6 characters"), { target: { value: "brand-new-1" } });
      save();
      expect(await screen.findByText("Enter your current password to set a new one.")).toBeTruthy();
      fireEvent.change(screen.getByPlaceholderText("Enter your current password"), { target: { value: "old-pass" } });
      fireEvent.change(screen.getByPlaceholderText("Re-enter your new password"), { target: { value: "different" } });
      save();
      expect((await screen.findAllByText(/do not match/)).length).toBeGreaterThan(0);
      expect(fetchFn).not.toHaveBeenCalled();

      fireEvent.change(screen.getByPlaceholderText("Re-enter your new password"), { target: { value: "brand-new-1" } });
      save();
      await waitFor(() => expect(fetchFn).toHaveBeenCalled());
      expect(sent(fetchFn).body).toMatchObject({ password: "brand-new-1", currentPassword: "old-pass" });
    });

    it("rejects a short new password locally", async () => {
      const fetchFn = mockFetch({ body: { success: true } });
      view();
      fireEvent.change(screen.getByPlaceholderText("Minimum 6 characters"), { target: { value: "123" } });
      save();
      expect(await screen.findByText(/at least 6 characters/)).toBeTruthy();
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("shows the server's error, for example a wrong current password", async () => {
      mockFetch({ ok: false, status: 403, body: { error: "Your current password is incorrect." } });
      view();
      fireEvent.change(screen.getByPlaceholderText("Minimum 6 characters"), { target: { value: "brand-new-1" } });
      fireEvent.change(screen.getByPlaceholderText("Enter your current password"), { target: { value: "wrong" } });
      fireEvent.change(screen.getByPlaceholderText("Re-enter your new password"), { target: { value: "brand-new-1" } });
      save();
      expect(await screen.findByText(/current password is incorrect/)).toBeTruthy();
    });
  });

  describe("dropping the active course", () => {
    it("asks for confirmation before doing anything", () => {
      const fetchFn = mockFetch({ body: {} });
      view();
      fireEvent.click(screen.getByTitle("Drop course to unlock new enrollment"));
      expect(screen.getByText("Drop Active Course?")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: /Cancel|Keep/ }));
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("drops it through the API and reports the released lock", async () => {
      const fetchFn = mockFetch({ body: { success: true, message: 'Successfully dropped "Intro to Programming". Your single-course lock is now released.' } });
      view();
      fireEvent.click(screen.getByTitle("Drop course to unlock new enrollment"));
      fireEvent.click(screen.getByRole("button", { name: "Confirm Drop" }));
      expect(await screen.findByText(/single-course lock is now released/)).toBeTruthy();
      expect(sent(fetchFn)).toEqual({ url: "/api/student/courses/drop", method: "POST", body: { courseId: "c1" } });
    });

    it("shows the reason if dropping fails", async () => {
      mockFetch({ ok: false, status: 400, body: { error: "Completed courses cannot be dropped." } });
      view();
      fireEvent.click(screen.getByTitle("Drop course to unlock new enrollment"));
      fireEvent.click(screen.getByRole("button", { name: "Confirm Drop" }));
      expect(await screen.findByText("Completed courses cannot be dropped.")).toBeTruthy();
    });
  });

  describe("payment history and receipts", () => {
    it("lists payments with their real status", () => {
      view();
      expect(screen.getAllByText("SUCCESS").length).toBeGreaterThan(0);
      expect(screen.getAllByText("FAILED").length).toBeGreaterThan(0);
    });

    it("opens a printable receipt with the reference, amount and Paystack details", () => {
      view();
      fireEvent.click(screen.getAllByText(/View Receipt/)[0]);
      expect(screen.getByText("Receipt No: REC-PP-CRS-ABC-1")).toBeTruthy();
      expect(screen.getByText(/Paystack Ref: 998877/)).toBeTruthy();
      expect(screen.getAllByText(/15,000/).length).toBeGreaterThan(0);
    });

    it("the receipt is issued by Academia, with no invented bursary or institution", () => {
      view();
      fireEvent.click(screen.getAllByText(/View Receipt/)[0]);
      const text = document.body.textContent!;
      expect(text).toContain("Issued by Academia LMS");
      for (const claim of ["Bursary", "BURSARY", "Federal Polytechnic", "Official Academic", "Official Institutional"]) {
        expect(text, claim).not.toContain(claim);
      }
    });

    describe("fee breakdown on the receipt", () => {
      const withFees = () => {
        const breakdown = { coursePriceNgn: 20000, platformFeeNgn: 400, processingFeeNgn: 413, totalNgn: 20813, platformFeeLabel: "Platform service fee" };
        return [
          { id: "p9", reference: "PP-FEES", amount: 20813, status: "SUCCESS", channel: "card", paidAt: "2026-06-01T10:00:00Z", createdAt: "2026-06-01T09:59:00Z", paystackRef: "55", metadata: JSON.stringify({ breakdown }), course: { title: "Intro to Programming" } },
        ];
      };

      it("itemises course fee, service fee, processing and the total the student actually paid", () => {
        view({ payments: withFees() });
        fireEvent.click(screen.getByText(/View Receipt/));
        const receipt = document.body.textContent!;
        expect(receipt).toMatch(/Intro to Programming.*20,000/);
        expect(receipt).toMatch(/Platform service fee.*400/);
        expect(receipt).toMatch(/Payment processing \(Paystack\).*413/);
        expect(receipt).toMatch(/Total Remittance \(NGN\):.*20,813/);
      });

      it("older receipts without a breakdown still show a single line with the amount paid", () => {
        view();
        fireEvent.click(screen.getAllByText(/View Receipt/)[0]);
        expect(document.body.textContent).not.toMatch(/Platform service fee|Payment processing/);
        expect(document.body.textContent).toMatch(/Total Remittance \(NGN\):.*15,000/);
      });

      it("copes with damaged breakdown data", () => {
        const broken = withFees();
        broken[0].metadata = "{not json";
        view({ payments: broken });
        fireEvent.click(screen.getByText(/View Receipt/));
        expect(document.body.textContent).toMatch(/Total Remittance \(NGN\):.*20,813/);
      });
    });

    it("can print the receipt", () => {
      const print = vi.fn();
      vi.stubGlobal("print", print);
      view();
      fireEvent.click(screen.getAllByText(/View Receipt/)[0]);
      fireEvent.click(screen.getByRole("button", { name: /Print/ }));
      expect(print).toHaveBeenCalled();
    });
  });
});

/* ───────────────────────────── enroll button on the course page ───────────────────────────── */
describe("CourseEnrollmentAction", () => {
  const paid = { id: "c1", title: "Intro to Programming", price: 15000, description: "d" };
  const free = { ...paid, price: 0 };
  const action = (course = paid, currentUser: any = student) =>
    render(<CourseEnrollmentAction currentUser={currentUser} course={course} activeEnrollment={null} />);

  it("shows the price on the button for a paid course", () => {
    action();
    expect(screen.getByRole("button", { name: /Enroll with Paystack/ }).textContent).toMatch(/15,000/);
  });

  it("does not talk about Paystack or a ₦0 price for a free course", () => {
    action(free);
    const button = screen.getByRole("button", { name: /Enroll/ });
    expect(button.textContent).toMatch(/Enroll for free/i);
    expect(button.textContent).not.toMatch(/Paystack|₦0|NGN 0/);
  });

  it("opens the checkout when clicked", () => {
    action();
    expect(screen.queryByText("Course Checkout")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Enroll with Paystack/ }));
    expect(screen.getByText("Course Checkout")).toBeTruthy();
  });
});
