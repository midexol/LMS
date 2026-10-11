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
vi.mock("@/components/auth/PrivyAuthButton", () => ({ PrivyAuthButton: () => <div data-testid="privy-button" /> }));

import { SignupsChart } from "@/components/admin/SignupsChart";
import LoginPage from "@/app/login/page";
import SignupPage from "@/app/signup/page";
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

  it("shows the form, social login and links to reset, sign up, Terms and Privacy", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
    expect(screen.getByTestId("privy-button")).toBeTruthy();
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
    const v = { name: "Ada Obi", email: "ada@test.com", phone: "0803 123 4567", password: "secret12", confirm: "secret12", ...over };
    fireEvent.change(screen.getByPlaceholderText("e.g. Alex Rivera"), { target: { value: v.name } });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: v.email } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 0803 123 4567"), { target: { value: v.phone } });
    fireEvent.change(screen.getByPlaceholderText("Min 6 characters"), { target: { value: v.password } });
    fireEvent.change(screen.getByPlaceholderText("Re-enter password"), { target: { value: v.confirm } });
  };
  const submit = () => fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

  it("is student-only: there is no role picker, and the copy makes no inflated claims", () => {
    const { container } = render(<SignupPage />);
    expect(screen.getByText(/Create your student account/)).toBeTruthy();
    expect(container.textContent).not.toMatch(/thousands|Instructor\b.*role|select your role/i);
    expect(screen.getByText("Terms of Service").getAttribute("href")).toBe("/terms");
    expect(screen.getByText("Privacy Policy").getAttribute("href")).toBe("/privacy");
  });

  it("refuses mismatched passwords without calling the server", () => {
    const fetchFn = mockFetch({ body: {} });
    render(<SignupPage />);
    fill({ confirm: "different1" });
    submit();
    expect(screen.getByText(/Passwords do not match/)).toBeTruthy();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("refuses passwords shorter than 6 characters without calling the server", () => {
    const fetchFn = mockFetch({ body: {} });
    render(<SignupPage />);
    fill({ password: "12345", confirm: "12345" });
    submit();
    expect(screen.getByText(/at least 6 characters/)).toBeTruthy();
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
    expect(body).toMatchObject({ name: "Ada Obi", email: "ada@test.com", phone: "0803 123 4567", password: "secret12" });
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
    expect(screen.getByText(/Browse Courses/).closest("a")!.getAttribute("href")).toBe("/my-courses");
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
    expect(screen.queryByText("Browse by subject")).toBeNull();
    expect(screen.queryByText(/loading/i)).toBeNull();
  });

  it("shows live category counts with correct singular and plural", () => {
    page({ categoryCounts: [{ category: "Business", count: 7 }, { category: "Science", count: 1 }] });
    expect(screen.getByText("Browse by subject")).toBeTruthy();
    expect(screen.getByText("7 courses")).toBeTruthy();
    expect(screen.getByText("1 course")).toBeTruthy();
  });

  it("links each course card to that course, with its real price", () => {
    page({ featuredCourses: [course(), course({ id: "course_2", title: "Free Intro", price: 0 })] });
    const card = screen.getByText("Intro to Biology").closest("div.group")!;
    expect(within(card as HTMLElement).getByText("View course").getAttribute("href")).toBe("/courses/course_1");
    expect(within(card as HTMLElement).getByText(/15,000/)).toBeTruthy();
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.getAllByText(/2 Modules/).length).toBeGreaterThan(0);
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

  it("is student-first: instructors are reached through the footer and FAQ, not a sales pitch", () => {
    const { container } = page();
    expect(container.textContent).not.toMatch(/Teaching a course\?/);
    expect(screen.getByText("Instructor sign in").getAttribute("href")).toBe("/instructor/login");
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
    const open = () => fireEvent.click(screen.getByText(/Contact & Support/));
    const fill = (over: Record<string, string> = {}) => {
      const v = { name: "Visitor One", email: "visitor@test.com", message: "I paid but cannot see my course.", ...over };
      fireEvent.change(screen.getByPlaceholderText("Your full name"), { target: { value: v.name } });
      fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: v.email } });
      fireEvent.change(screen.getByPlaceholderText(/How can our support team assist/), { target: { value: v.message } });
    };
    const send = () => fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    it("opens from the footer and offers the 'Teaching on Academia' topic", () => {
      page();
      expect(screen.queryByText("Direct Assistance")).toBeNull();
      open();
      expect(screen.getByText("Direct Assistance")).toBeTruthy();
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
      expect(await screen.findByText("Inquiry Submitted")).toBeTruthy();
      expect(screen.getByText("visitor@test.com")).toBeTruthy();
    });

    it("does NOT claim success when sending fails, and keeps what the visitor typed", async () => {
      mockFetch({ ok: false, status: 429, body: { error: "You have sent several messages recently. Please try again later." } });
      page();
      open();
      fill();
      send();
      expect(await screen.findByText(/sent several messages recently/)).toBeTruthy();
      expect(screen.queryByText("Inquiry Submitted")).toBeNull();
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
      fireEvent.click(screen.getByRole("button", { name: "Close Window" }));
      expect(screen.queryByText("Direct Assistance")).toBeNull();
    });
  });
});

/* ───────────────────────────── checkout modal ───────────────────────────── */
describe("MockCheckoutModal (course checkout)", () => {
  const student = { id: "stu_1", name: "Stu Dent", email: "stu@test.com", department: "Chemistry" };
  const paid = { id: "course_1", title: "Intro to Biology", price: 15000, description: "d" };
  const free = { ...paid, title: "Free Intro", price: 0 };

  const modal = (over: Partial<React.ComponentProps<typeof MockCheckoutModal>> = {}) => {
    const props = { isOpen: true, onClose: vi.fn(), onEnrollSuccess: vi.fn(), currentUser: student, course: paid, activeEnrollment: null, ...over };
    render(<MockCheckoutModal {...props} />);
    return props;
  };

  it("renders nothing while closed", () => {
    const { container } = render(
      <MockCheckoutModal isOpen={false} onClose={vi.fn()} onEnrollSuccess={vi.fn()} currentUser={student} course={paid} activeEnrollment={null} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows the price and who is paying", () => {
    modal();
    expect(screen.getByText(/Pay .*15,000 & Enroll/)).toBeTruthy();
    expect(screen.getByText(/Stu Dent \(stu@test.com\)/)).toBeTruthy();
    expect(screen.getByText("Secure payment by Paystack")).toBeTruthy();
  });

  it("starts the payment and redirects to Paystack's checkout page", async () => {
    const fetchFn = mockFetch({ body: { success: true, authorizationUrl: "https://checkout.paystack.com/abc" } });
    const loc = trapNavigation();
    modal();
    fireEvent.click(screen.getByRole("button", { name: /Pay .*15,000/ }));
    await waitFor(() => expect(loc.href).toBe("https://checkout.paystack.com/abc"));
    expect(fetchFn.mock.calls[0][0]).toBe("/api/payment/initialize");
    expect(lastBody(fetchFn)).toEqual({ courseId: "course_1" });
  });

  it("shows the server's reason when payment cannot start (for example an unverified email)", async () => {
    mockFetch({ ok: false, status: 403, body: { error: "Please verify your email address before enrolling." } });
    modal();
    fireEvent.click(screen.getByRole("button", { name: /Pay .*15,000/ }));
    expect(await screen.findByText(/verify your email address/)).toBeTruthy();
    expect((screen.getByRole("button", { name: /Pay .*15,000/ }) as HTMLButtonElement).disabled).toBe(false); // can retry
  });

  it("sends a signed-out visitor to log in instead of calling the payment API", () => {
    const fetchFn = mockFetch({ body: {} });
    const loc = trapNavigation();
    modal({ currentUser: null });
    const action = screen.queryByRole("button", { name: /Pay .*15,000/ });
    if (action) {
      fireEvent.click(action);
      expect(loc.href).toBe("/login");
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("explains the one-course rule instead of offering to pay when another course is active", () => {
    modal({ activeEnrollment: { id: "e1", courseId: "other", courseTitle: "Chemistry 101" } });
    expect(screen.getByText("Chemistry 101")).toBeTruthy();
    expect(screen.getByText(/only one active course/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Pay/ })).toBeNull();
    expect(screen.getByText(/Go to Active Course/).closest("a")!.getAttribute("href")).toBe("/student/courses/other");
  });

  describe("free course", () => {
    it("offers 'Enroll for free', not a price", () => {
      modal({ course: free });
      expect(screen.getByRole("button", { name: /Enroll for free/ })).toBeTruthy();
      expect(screen.queryByText(/Pay .*0 & Enroll/)).toBeNull();
    });

    it("enrolls immediately without any Paystack redirect and opens the course", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      mockFetch({ body: { success: true, free: true, courseId: "course_1" } });
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
      mockFetch({ body: { success: true, free: true } });
      modal({ course: free });
      fireEvent.click(screen.getByRole("button", { name: /Enroll for free/ }));
      expect(await screen.findByText(/You are enrolled/)).toBeTruthy();
      expect(screen.queryByText(/Payment Confirmed/)).toBeNull();
    });
  });
});
