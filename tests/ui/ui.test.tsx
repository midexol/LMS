// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within, act } from "@testing-library/react";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { SignupsChart } from "@/components/admin/SignupsChart";
import LoginPage from "@/app/login/page";
import SignupPage from "@/app/signup/page";
import { ACADEMIC_STRUCTURE } from "@/lib/academicStructure";
import { LandingPage } from "@/app/LandingPage";
import { MockCheckoutModal } from "@/components/ui/MockCheckoutModal";

type FetchReply = { ok?: boolean; status?: number; body: unknown };
/** Replace fetch with a fake that answers from a queue and records every call. */
function mockFetch(...replies: FetchReply[]) {
  const queue = [...replies];
  const fn = vi.fn(async (_url?: unknown, _init?: RequestInit) => {
    const r = queue.length > 1 ? queue.shift()! : queue[0];
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.body } as Response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}
const lastBody = (fn: { mock: { calls: any[][] } }) => JSON.parse((fn.mock.calls.at(-1)![1] as RequestInit).body as string);

/** Capture navigation: pages assign window.location.href. */
function trapNavigation() {
  const loc = { href: "", assign: vi.fn(), replace: vi.fn(), pathname: "/", search: "" };
  vi.stubGlobal("location", loc);
  return loc;
}

beforeEach(() => {
  nav.push.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => cleanup());

const daysAgo = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

/* ───────────────────────────── admin sign-ups chart ───────────────────────────── */
describe("SignupsChart", () => {
  it("counts accounts per day, shows the total and the busiest day", () => {
    const { container } = render(<SignupsChart createdAt={[daysAgo(0), daysAgo(0), daysAgo(1), daysAgo(5)]} />);
    expect(screen.getByText("New Accounts, Last 30 Days")).toBeTruthy();
    expect(container.querySelector("span.text-3xl")!.textContent).toBe("4"); // the headline total
    expect(screen.getByText(/peak 2\/day/)).toBeTruthy();
    expect(container.querySelectorAll("svg path").length).toBe(3); // one bar per day that had sign-ups
  });

  it("describes itself to screen readers", () => {
    render(<SignupsChart createdAt={[daysAgo(0), daysAgo(2)]} />);
    const label = screen.getByRole("img").getAttribute("aria-label")!;
    expect(label).toMatch(/last 30 days/);
    expect(label).toMatch(/2 in total/);
  });

  it("ignores accounts older than the window", () => {
    render(<SignupsChart createdAt={[daysAgo(0), daysAgo(45), daysAgo(90)]} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/1 in total/);
  });

  it("offers the same numbers as a table", () => {
    const { container } = render(<SignupsChart createdAt={[daysAgo(0), daysAgo(0), daysAgo(3)]} />);
    const rows = container.querySelectorAll("details tbody tr");
    expect(rows.length).toBe(2);
    expect(Array.from(rows).map((r) => r.textContent).join(" ")).toMatch(/2/);
  });

  it("handles no data without breaking", () => {
    const { container } = render(<SignupsChart createdAt={[]} />);
    expect(screen.getByText(/No new accounts in this period/)).toBeTruthy();
    expect(container.querySelectorAll("svg path").length).toBe(0);
    expect(screen.getByText(/accounts · peak 0\/day/)).toBeTruthy();
  });

  it("uses the singular for exactly one account", () => {
    render(<SignupsChart createdAt={[daysAgo(0)]} />);
    expect(screen.getByText(/account · peak 1\/day/)).toBeTruthy();
  });

  it("honours a custom window", () => {
    render(<SignupsChart createdAt={[daysAgo(10)]} days={7} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/last 7 days.*0 in total/);
  });
});

/* ───────────────────────────── login page ───────────────────────────── */
describe("Login page", () => {
  const fill = (email = "ada@test.com", password = "secret12") => {
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: email } });
    fireEvent.change(screen.getByPlaceholderText("Your password"), { target: { value: password } });
  };
  const submit = () => fireEvent.click(screen.getByRole("button", { name: /Sign In to Account/ }));

  it("shows the form (no Google sign-in for now) and links to reset, sign up, Terms and Privacy", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
    expect(screen.queryByTestId("google-button")).toBeNull();
    expect(screen.getByText("Forgot password?").getAttribute("href")).toBe("/forgot-password");
    expect(screen.getByText("Create one free").getAttribute("href")).toBe("/signup");
    expect(screen.getByText("Terms of Service").getAttribute("href")).toBe("/terms");
    expect(screen.getByText("Privacy Policy").getAttribute("href")).toBe("/privacy");
  });

  it("keeps the submit button disabled until both fields are filled", () => {
    render(<LoginPage />);
    const button = screen.getByRole("button", { name: /Sign In to Account/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "a@test.com" } });
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Your password"), { target: { value: "x" } });
    expect(button.disabled).toBe(false);
  });

  it("posts the credentials to the login API", async () => {
    const fetchFn = mockFetch({ body: { user: { role: "STUDENT" } } });
    trapNavigation();
    render(<LoginPage />);
    fill();
    submit();
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());
    expect(fetchFn.mock.calls[0][0]).toBe("/api/auth/login");
    expect(lastBody(fetchFn)).toEqual({ email: "ada@test.com", password: "secret12" });
  });

  it.each([
    ["STUDENT", "/my-courses"],
    ["TUTOR", "/instructor"],
    ["ADMIN", "/admin"],
    ["SUPERADMIN", "/admin"],
  ])("sends a %s to %s after signing in", async (role, destination) => {
    mockFetch({ body: { user: { role } } });
    const loc = trapNavigation();
    render(<LoginPage />);
    fill();
    submit();
    await waitFor(() => expect(loc.href).toBe(destination));
  });

  it("shows the server's error and stays on the page when sign-in fails", async () => {
    mockFetch({ ok: false, status: 401, body: { error: "Invalid email or password." } });
    const loc = trapNavigation();
    render(<LoginPage />);
    fill();
    submit();
    expect(await screen.findByText("Invalid email or password.")).toBeTruthy();
    expect(loc.href).toBe("");
  });

  it("shows a rate-limit message from the server", async () => {
    mockFetch({ ok: false, status: 429, body: { error: "Too many login attempts. Please wait 40 seconds before trying again." } });
    render(<LoginPage />);
    fill();
    submit();
    expect(await screen.findByText(/Too many login attempts/)).toBeTruthy();
  });

  it("handles a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));
    render(<LoginPage />);
    fill();
    submit();
    expect(await screen.findByText("Failed to fetch")).toBeTruthy();
  });

  it("can reveal and hide the password", () => {
    render(<LoginPage />);
    const input = screen.getByPlaceholderText("Your password") as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.click(input.parentElement!.querySelector("button")!);
    expect(input.type).toBe("text");
  });
});

/* ───────────────────────────── signup page ───────────────────────────── */
describe("Signup page", () => {
  const fill = (over: Record<string, string> = {}) => {
    const v = { name: "Ada Obi", email: "ada@test.com", phone: "0803 123 4567", password: "secret12", faculty: ACADEMIC_STRUCTURE[0].name, department: ACADEMIC_STRUCTURE[0].departments[1], ...over };
    fireEvent.change(screen.getByPlaceholderText("e.g. Alex Rivera"), { target: { value: v.name } });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: v.email } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 0803 123 4567"), { target: { value: v.phone } });
    fireEvent.change(screen.getByPlaceholderText("Min 6 characters"), { target: { value: v.password } });
    if (v.faculty) fireEvent.change(screen.getByLabelText("Faculty / School"), { target: { value: v.faculty } });
    if (v.department) fireEvent.change(screen.getByLabelText("Department"), { target: { value: v.department } });
  };
  const submit = () => fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

  it("is student-only: there is no role picker, and the copy makes no inflated claims", () => {
    const { container } = render(<SignupPage />);
    expect(screen.getByText(/Create your student account/)).toBeTruthy();
    expect(container.textContent).not.toMatch(/thousands|Instructor\b.*role|select your role/i);
    expect(screen.getByText("Terms of Service").getAttribute("href")).toBe("/terms");
    expect(screen.getByText("Privacy Policy").getAttribute("href")).toBe("/privacy");
  });

  it("starts with no faculty chosen, and the department list is locked until one is", () => {
    render(<SignupPage />);
    expect((screen.getByLabelText("Faculty / School") as HTMLSelectElement).value).toBe("");
    expect((screen.getByLabelText("Department") as HTMLSelectElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Faculty / School"), { target: { value: ACADEMIC_STRUCTURE[0].name } });
    expect((screen.getByLabelText("Department") as HTMLSelectElement).disabled).toBe(false);
  });

  it("changing the faculty clears a department that no longer belongs", () => {
    render(<SignupPage />);
    fill();
    expect((screen.getByLabelText("Department") as HTMLSelectElement).value).toBe(ACADEMIC_STRUCTURE[0].departments[1]);
    fireEvent.change(screen.getByLabelText("Faculty / School"), { target: { value: ACADEMIC_STRUCTURE[1].name } });
    expect((screen.getByLabelText("Department") as HTMLSelectElement).value).toBe("");
  });

  it("keeps Create Account disabled until a faculty and department are chosen", () => {
    const fetchFn = mockFetch({ body: {} });
    render(<SignupPage />);
    fill({ faculty: "", department: "" });
    const button = screen.getByRole("button", { name: "Create Account" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("refuses passwords shorter than 6 characters without calling the server", () => {
    const fetchFn = mockFetch({ body: {} });
    render(<SignupPage />);
    fill({ password: "12345" });
    expect(screen.getByText(/at least 6 characters/)).toBeTruthy();
    submit();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sends the details (including the optional phone) and never a role", async () => {
    const fetchFn = mockFetch({ body: { success: true } });
    render(<SignupPage />);
    fill();
    submit();
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());
    expect(fetchFn.mock.calls[0][0]).toBe("/api/auth/register");
    const body = lastBody(fetchFn);
    expect(body).toMatchObject({ name: "Ada Obi", email: "ada@test.com", phone: "0803 123 4567", password: "secret12", faculty: ACADEMIC_STRUCTURE[0].name, department: ACADEMIC_STRUCTURE[0].departments[1] });
    expect(body).not.toHaveProperty("role");
  });

  it("then tells the user to check their inbox and not to expect instant enrollment", async () => {
    mockFetch({ body: { success: true } });
    render(<SignupPage />);
    fill();
    submit();
    expect(await screen.findByText("Check Your Inbox")).toBeTruthy();
    expect(screen.getByText("ada@test.com")).toBeTruthy();
    expect(screen.getByText(/must verify your email before you can enroll/)).toBeTruthy();
    expect(screen.getByText(/Browse Courses/).closest("a")!.getAttribute("href")).toBe("/courses");
  });

  it("shows the server's error (for example a duplicate email)", async () => {
    mockFetch({ ok: false, status: 400, body: { error: "An account with this email already exists." } });
    render(<SignupPage />);
    fill();
    submit();
    expect(await screen.findByText("An account with this email already exists.")).toBeTruthy();
    expect(screen.queryByText("Check Your Inbox")).toBeNull();
  });
});

/* ───────────────────────────── landing page ───────────────────────────── */
describe("Landing page", () => {
  const course = (over: Record<string, unknown> = {}) => ({
    id: "course_1",
    title: "Intro to Biology",
    description: "Learn the basics of life science.",
    category: "Science",
    price: 15000,
    coverImage: null,
    modules: [{ id: "m1" }, { id: "m2" }],
    tutor: { name: "Dr. Ade" },
    ...over,
  });
  const page = (props: Partial<React.ComponentProps<typeof LandingPage>> = {}) =>
    render(<LandingPage featuredCourses={[]} categoryCounts={[]} {...props} />);

  it("leads with the student promise and a clear sign-up action", () => {
    page();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Learn one course at a time/);
    expect(screen.getAllByText("Create free account")[0].closest("a")!.getAttribute("href")).toBe("/signup");
    expect(screen.getAllByText("Browse courses")[0].closest("a")!.getAttribute("href")).toBe("/courses");
  });

  it("contains no invented statistics or placeholder claims", () => {
    const { container } = page();
    const text = container.textContent!;
    for (const fake of ["Cohort Mastery", "Pass Velocity", "High Distinction", "12 courses", "accredited", "university-grade", "thousands of"]) {
      expect(text.toLowerCase()).not.toContain(fake.toLowerCase());
    }
  });

  it("with no courses: says so honestly and hides the category row", () => {
    page();
    expect(screen.getByText(/New courses are coming soon/)).toBeTruthy();
    expect(screen.queryByText("Subjects")).toBeNull();
    expect(screen.queryByText(/loading/i)).toBeNull();
  });

  it("shows live category counts with correct singular and plural", () => {
    page({ categoryCounts: [{ category: "Business", count: 7 }, { category: "Science", count: 1 }] });
    expect(screen.getByText("Subjects")).toBeTruthy();
    expect(screen.getByText("(7 courses)")).toBeTruthy();
    expect(screen.getByText("(1 course)")).toBeTruthy();
  });

  it("links each course card to that course, with its real price", () => {
    page({ featuredCourses: [course(), course({ id: "course_2", title: "Free Intro", price: 0 })] });
    const card = screen.getByText("Intro to Biology").closest("article")!;
    expect(within(card as HTMLElement).getByText("View course").getAttribute("href")).toBe("/courses/course_1");
    expect(within(card as HTMLElement).getByText(/15,000/)).toBeTruthy();
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.getAllByText(/2 modules/).length).toBeGreaterThan(0);
  });

  it("answers the questions students actually have", () => {
    page();
    for (const q of [
      "Can I take more than one course at once?",
      "How do I pay?",
      "How are my assignments graded?",
      "What do I need to complete a course?",
      "Is the certificate a degree?",
      "Can I get a refund?",
      "How do I become an instructor?",
      "Who can see my work?",
    ]) {
      expect(screen.getByText(q)).toBeTruthy();
    }
  });

  it("is student-first: instructors use the normal Sign In and ask through the FAQ, with no sales pitch", () => {
    const { container } = page();
    expect(container.textContent).not.toMatch(/Teaching a course\?/);
    // instructors are set up by an admin and use the normal Sign In: no instructor link is advertised to the public
    expect(screen.queryByText("Instructor sign in")).toBeNull();
    expect(document.querySelector('a[href="/instructor/login"]')).toBeNull();
    expect(screen.getAllByText("Sign in").length).toBeGreaterThan(0);
  });

  describe("footer", () => {
    it("shows the default institution line", () => {
      page();
      expect(screen.getByText("A product of The Federal Polytechnic, Ado-Ekiti")).toBeTruthy();
    });

    it("lets you override it, or hide it with '-'", () => {
      vi.stubEnv("NEXT_PUBLIC_INSTITUTION_NAME", "A product of Example Institute");
      const first = page();
      expect(screen.getByText("A product of Example Institute")).toBeTruthy();
      first.unmount();

      vi.stubEnv("NEXT_PUBLIC_INSTITUTION_NAME", "-");
      page();
      expect(screen.queryByText(/A product of/)).toBeNull();
    });

    it("links to Terms and Privacy pages (not popups)", () => {
      page();
      expect(screen.getByText("Terms").getAttribute("href")).toBe("/terms");
      expect(screen.getByText("Privacy").getAttribute("href")).toBe("/privacy");
    });
  });

  describe("contact form", () => {
    const open = () => fireEvent.click(screen.getByText(/Contact and support/));
    const fill = (over: Record<string, string> = {}) => {
      const v = { name: "Visitor One", email: "visitor@test.com", message: "I paid but cannot see my course.", ...over };
      fireEvent.change(screen.getByPlaceholderText("Your full name"), { target: { value: v.name } });
      fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: v.email } });
      fireEvent.change(screen.getByPlaceholderText("How can we help?"), { target: { value: v.message } });
    };
    const send = () => fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    it("opens from the footer and offers the 'Teaching on Academia' topic", () => {
      page();
      expect(screen.queryByRole("dialog")).toBeNull();
      open();
      expect(screen.getByRole("dialog")).toBeTruthy();
      expect(screen.getByRole("option", { name: "Teaching on Academia" })).toBeTruthy();
    });

    it("actually sends the message to the server (with an empty honeypot)", async () => {
      const fetchFn = mockFetch({ body: { success: true } });
      page();
      open();
      fill();
      send();
      await waitFor(() => expect(fetchFn).toHaveBeenCalled());
      expect(fetchFn.mock.calls[0][0]).toBe("/api/contact");
      expect(lastBody(fetchFn)).toEqual({
        name: "Visitor One",
        email: "visitor@test.com",
        subject: "Technical & Course Support",
        message: "I cannot see my course.".replace("I cannot see my course.", "I paid but cannot see my course."),
        website: "",
      });
    });

    it("confirms receipt only after the server accepts the message", async () => {
      mockFetch({ body: { success: true } });
      page();
      open();
      fill();
      send();
      expect(await screen.findByText("Message received")).toBeTruthy();
      expect(screen.getByText("visitor@test.com")).toBeTruthy();
    });

    it("does NOT claim success when sending fails, and keeps what the visitor typed", async () => {
      mockFetch({ ok: false, status: 429, body: { error: "You have sent several messages recently. Please try again later." } });
      page();
      open();
      fill();
      send();
      expect(await screen.findByText(/sent several messages recently/)).toBeTruthy();
      expect(screen.queryByText("Message received")).toBeNull();
      expect((screen.getByPlaceholderText("Your full name") as HTMLInputElement).value).toBe("Visitor One");
    });

    it("reports network errors", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));
      page();
      open();
      fill();
      send();
      expect(await screen.findByText("Failed to fetch")).toBeTruthy();
    });

    it("includes a hidden honeypot field that real users cannot reach", () => {
      page();
      open();
      const trap = document.querySelector('input[tabindex="-1"]') as HTMLInputElement;
      expect(trap).toBeTruthy();
      expect(trap.closest(".hidden")).toBeTruthy();
      expect(trap.getAttribute("autocomplete")).toBe("off");
    });

    it("shows the support email only when one is configured", () => {
      const without = page();
      open();
      expect(screen.queryByText("Email Support")).toBeNull();
      without.unmount();

      vi.stubEnv("NEXT_PUBLIC_SUPPORT_EMAIL", "help@example.edu.ng");
      page();
      open();
      expect(screen.getByText("help@example.edu.ng").getAttribute("href")).toBe("mailto:help@example.edu.ng");
    });

    it("can be closed", () => {
      page();
      open();
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});

/* ───────────────────────────── checkout modal ───────────────────────────── */
describe("MockCheckoutModal (course checkout)", () => {
  const student = { id: "stu_1", name: "Stu Dent", email: "stu@test.com", department: "Chemistry" };
  const paid = { id: "course_1", title: "Intro to Biology", price: 15000, description: "d" };
  const free = { ...paid, title: "Free Intro", price: 0 };

  /** The breakdown the server would send for a course price, platform fee and processing fee. */
  const breakdown = (price: number, platformFeeNgn = 0, processingFeeNgn = 0, label = "Platform service fee") => ({
    coursePriceNgn: price,
    platformFeeNgn,
    processingFeeNgn,
    totalNgn: price + platformFeeNgn + processingFeeNgn,
    platformFeeLabel: label,
  });

  /** Fake backend for the checkout: answers the price quote and the payment start separately. */
  function checkoutApi(opts: { quote?: ReturnType<typeof breakdown> | "fail" | "pending"; initialize?: FetchReply } = {}) {
    const reply = (r: FetchReply) => ({ ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.body }) as Response;
    const fn = vi.fn(async (url: unknown, _init?: RequestInit) => {
      if (String(url).startsWith("/api/payment/quote")) {
        if (opts.quote === "fail") throw new Error("offline");
        if (opts.quote === "pending") return new Promise<Response>(() => {});
        return reply({ body: { success: true, breakdown: opts.quote ?? breakdown(15000) } });
      }
      return reply(opts.initialize ?? { body: { success: true } });
    });
    vi.stubGlobal("fetch", fn);
    const initializeCalls = () => fn.mock.calls.filter((c) => String(c[0]) === "/api/payment/initialize");
    return { fn, initializeCalls };
  }

  const modal = (over: Partial<React.ComponentProps<typeof MockCheckoutModal>> = {}) => {
    const props = { isOpen: true, onClose: vi.fn(), onEnrollSuccess: vi.fn(), currentUser: student, course: paid, activeEnrollment: null, ...over };
    render(<MockCheckoutModal {...props} />);
    return props;
  };

  it("renders nothing while closed", () => {
    checkoutApi();
    const { container } = render(
      <MockCheckoutModal isOpen={false} onClose={vi.fn()} onEnrollSuccess={vi.fn()} currentUser={student} course={paid} activeEnrollment={null} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows the price and who is paying", async () => {
    checkoutApi();
    modal();
    expect(await screen.findByText(/Pay .*15,000 & Enroll/)).toBeTruthy();
    expect(screen.getByText(/Stu Dent \(stu@test.com\)/)).toBeTruthy();
    expect(screen.getByText("Secure payment by Paystack")).toBeTruthy();
  });

  describe("fee breakdown", () => {
    it("asks the server for the exact price of THIS course", async () => {
      const api = checkoutApi();
      modal();
      await screen.findByText(/Pay .*15,000/);
      expect(String(api.fn.mock.calls[0][0])).toBe("/api/payment/quote?courseId=course_1");
    });

    it("shows course fee, your service fee, Paystack's processing charge and the total (N20,000 course)", async () => {
      checkoutApi({ quote: breakdown(20000, 400, 413) });
      modal({ course: { ...paid, price: 20000 } });
      const box = await screen.findByTestId("price-breakdown");
      await waitFor(() => expect(within(box).getByText("Total to pay")).toBeTruthy());

      const text = box.textContent!;
      expect(text).toMatch(/Course fee.*20,000/);
      expect(text).toMatch(/Platform service fee.*400/);
      expect(text).toMatch(/Payment processing \(Paystack\).*413/);
      expect(text).toMatch(/Total to pay.*20,813/);
      expect(screen.getByRole("button", { name: /Pay .*20,813 & Enroll/ })).toBeTruthy();
    });

    it("uses the wording the server sends for the fee", async () => {
      checkoutApi({ quote: breakdown(20000, 400, 413, "Learning platform fee") });
      modal({ course: { ...paid, price: 20000 } });
      expect(await screen.findByText("Learning platform fee")).toBeTruthy();
    });

    it("with no fees configured shows just the total, with no fee lines at all", async () => {
      checkoutApi({ quote: breakdown(15000) });
      modal();
      const box = await screen.findByTestId("price-breakdown");
      await waitFor(() => expect(box.textContent).toMatch(/Total to pay.*15,000/));
      expect(box.textContent).not.toMatch(/Platform service fee|Payment processing/);
    });

    it("hides the processing line when the student is not covering it", async () => {
      checkoutApi({ quote: breakdown(20000, 400, 0) });
      modal({ course: { ...paid, price: 20000 } });
      const box = await screen.findByTestId("price-breakdown");
      await waitFor(() => expect(box.textContent).toMatch(/Platform service fee.*400/));
      expect(box.textContent).not.toMatch(/Payment processing/);
      expect(box.textContent).toMatch(/Total to pay.*20,400/);
    });

    it("cannot be paid until the total is known (no paying a price that is still loading)", () => {
      checkoutApi({ quote: "pending" });
      modal();
      const button = screen.getByRole("button", { name: /Calculating total/ }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(screen.getByText("Calculating your total...")).toBeTruthy();
    });

    it("if the quote cannot be loaded, says so and still lets the student continue to Paystack", async () => {
      const api = checkoutApi({ quote: "fail", initialize: { body: { success: true, authorizationUrl: "https://checkout.paystack.com/abc" } } });
      const loc = trapNavigation();
      modal();
      expect(await screen.findByText(/could not load the price breakdown/)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: /Continue to payment/ }));
      await waitFor(() => expect(loc.href).toBe("https://checkout.paystack.com/abc"));
      expect(api.initializeCalls()).toHaveLength(1);
    });
  });

  describe("paying", () => {
    it("starts the payment and redirects to Paystack's checkout page", async () => {
      const api = checkoutApi({ initialize: { body: { success: true, authorizationUrl: "https://checkout.paystack.com/abc" } } });
      const loc = trapNavigation();
      modal();
      fireEvent.click(await screen.findByRole("button", { name: /Pay .*15,000/ }));
      await waitFor(() => expect(loc.href).toBe("https://checkout.paystack.com/abc"));
      expect(api.initializeCalls()).toHaveLength(1);
    });

    it("sends only the course id: the browser never tells the server what to charge", async () => {
      const api = checkoutApi({ quote: breakdown(20000, 400, 413), initialize: { body: { success: true, authorizationUrl: "https://checkout.paystack.com/abc" } } });
      trapNavigation();
      modal({ course: { ...paid, price: 20000 } });
      fireEvent.click(await screen.findByRole("button", { name: /Pay .*20,813/ }));
      await waitFor(() => expect(api.initializeCalls()).toHaveLength(1));
      expect(JSON.parse((api.initializeCalls()[0][1] as RequestInit).body as string)).toEqual({ courseId: "course_1" });
    });

    it("shows the server's reason when payment cannot start (for example an unverified email)", async () => {
      checkoutApi({ initialize: { ok: false, status: 403, body: { error: "Please verify your email address before enrolling." } } });
      modal();
      fireEvent.click(await screen.findByRole("button", { name: /Pay .*15,000/ }));
      expect(await screen.findByText(/verify your email address/)).toBeTruthy();
      expect((screen.getByRole("button", { name: /Pay .*15,000/ }) as HTMLButtonElement).disabled).toBe(false); // can retry
    });

    it("sends a signed-out visitor to sign in instead of calling the payment API", async () => {
      const api = checkoutApi();
      modal({ currentUser: null });
      expect(screen.getByText("Account Required")).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Pay/ })).toBeNull();
      expect(api.initializeCalls()).toHaveLength(0);
    });

    it("explains the one-course rule instead of offering to pay when another course is active", () => {
      checkoutApi();
      modal({ activeEnrollment: { id: "e1", courseId: "other", courseTitle: "Chemistry 101" } });
      expect(screen.getByText("Chemistry 101")).toBeTruthy();
      expect(screen.getByText(/only one active course/)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Pay/ })).toBeNull();
      expect(screen.getByText(/Go to Active Course/).closest("a")!.getAttribute("href")).toBe("/student/courses/other");
    });
  });

  describe("free course", () => {
    it("offers 'Enroll for free', shows no price breakdown and never asks for a quote", () => {
      const api = checkoutApi();
      modal({ course: free });
      expect(screen.getByRole("button", { name: /Enroll for free/ })).toBeTruthy();
      expect(screen.queryByText(/Pay .*0 & Enroll/)).toBeNull();
      expect(screen.queryByTestId("price-breakdown")).toBeNull();
      expect(api.fn.mock.calls.filter((c) => String(c[0]).startsWith("/api/payment/quote"))).toHaveLength(0);
    });

    it("enrolls immediately without any Paystack redirect and opens the course", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      checkoutApi({ initialize: { body: { success: true, free: true, courseId: "course_1" } } });
      const loc = trapNavigation();
      const props = modal({ course: free });

      fireEvent.click(screen.getByRole("button", { name: /Enroll for free/ }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      expect(loc.href).toBe("");
      expect(props.onEnrollSuccess).toHaveBeenCalled();
      expect(nav.push).toHaveBeenCalledWith("/student/courses/course_1");
    });

    it("does not claim a payment was made", async () => {
      checkoutApi({ initialize: { body: { success: true, free: true } } });
      modal({ course: free });
      fireEvent.click(screen.getByRole("button", { name: /Enroll for free/ }));
      expect(await screen.findByText(/You are enrolled/)).toBeTruthy();
      expect(screen.queryByText(/Payment Confirmed/)).toBeNull();
    });
  });
});
