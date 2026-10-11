// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { OnboardingClient } from "@/app/onboarding/OnboardingClient";
import { ACADEMIC_STRUCTURE } from "@/lib/academicStructure";

type Reply = { ok?: boolean; status?: number; body: unknown };
function mockFetch(reply: Reply) {
  const fn = vi.fn(async (_url?: unknown, _init?: RequestInit) => ({ ok: reply.ok ?? true, status: reply.status ?? 200, json: async () => reply.body }) as Response);
  vi.stubGlobal("fetch", fn);
  return fn;
}
const sentBody = (fn: { mock: { calls: any[][] } }) => JSON.parse((fn.mock.calls.at(-1)![1] as RequestInit).body as string);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  delete (window as any).google;
  document.head.querySelectorAll('script[src*="accounts.google.com"]').forEach((s) => s.remove());
});

/* ───────────────────────────── Google button ───────────────────────────── */
describe("GoogleAuthButton", () => {
  /** A fake of Google's script: records how it was set up and lets a test "click" the button. */
  function fakeGoogle() {
    const g = { callback: undefined as undefined | ((r: { credential?: string }) => void), clientId: "", rendered: undefined as any, renderOptions: undefined as any };
    (window as any).google = {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (r: { credential?: string }) => void }) => {
            g.clientId = cfg.client_id;
            g.callback = cfg.callback;
          },
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => {
            g.rendered = el;
            g.renderOptions = opts;
          },
        },
      },
    };
    return g;
  }

  it("is hidden until a Google client id is configured (never a button that cannot work)", () => {
    const { container } = render(<GoogleAuthButton />);
    expect(container.innerHTML).toBe("");
  });

  it("hides its 'or' divider too, so the forms never start with a dangling separator", () => {
    const { container } = render(<GoogleAuthButton dividerLabel="or use your email" />);
    expect(container.innerHTML).toBe("");
  });

  describe("when configured", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "123-abc.apps.googleusercontent.com");
    });

    it("shows the divider label under the button when one is given", () => {
      render(<GoogleAuthButton dividerLabel="or use your email" />);
      expect(screen.getByRole("separator")).toBeTruthy();
      expect(screen.getByText("or use your email")).toBeTruthy();
    });

    it("sets up Google's button with our client id", async () => {
      const g = fakeGoogle();
      render(<GoogleAuthButton />);
      await waitFor(() => expect(g.rendered).toBeTruthy());
      expect(g.clientId).toBe("123-abc.apps.googleusercontent.com");
      expect(g.renderOptions).toMatchObject({ text: "continue_with" });
    });

    it("loads Google's sign-in script once, from Google's own address", async () => {
      render(<GoogleAuthButton />);
      const script = await waitFor(() => {
        const el = document.head.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        expect(el).toBeTruthy();
        return el!;
      });
      expect(script.getAttribute("src")).toBe("https://accounts.google.com/gsi/client");
    });

    it("tells the user if Google's script cannot be loaded", async () => {
      render(<GoogleAuthButton />);
      const script = await waitFor(() => document.head.querySelector('script[src*="accounts.google.com"]') as HTMLScriptElement);
      script.dispatchEvent(new Event("error"));
      expect(await screen.findByText("Could not load Google sign-in.")).toBeTruthy();
    });

    it("sends only Google's credential to our server (no email or name from the page)", async () => {
      const g = fakeGoogle();
      const fetchFn = mockFetch({ body: { success: true, user: { role: "STUDENT" }, needsProfile: false } });
      vi.stubGlobal("location", { href: "" });
      render(<GoogleAuthButton />);
      await waitFor(() => expect(g.callback).toBeTruthy());

      g.callback!({ credential: "google-id-token" });
      await waitFor(() => expect(fetchFn).toHaveBeenCalled());
      expect(fetchFn.mock.calls[0][0]).toBe("/api/auth/google");
      expect(sentBody(fetchFn)).toEqual({ credential: "google-id-token" });
    });

    it.each([
      ["a new student with no faculty yet", { user: { role: "STUDENT" }, needsProfile: true }, "/onboarding"],
      ["a returning student", { user: { role: "STUDENT" }, needsProfile: false }, "/my-courses"],
      ["an instructor", { user: { role: "TUTOR" }, needsProfile: false }, "/instructor"],
      ["an admin", { user: { role: "ADMIN" }, needsProfile: false }, "/admin"],
      ["a super admin", { user: { role: "SUPERADMIN" }, needsProfile: false }, "/admin"],
    ])("sends %s to %s", async (_who, response, destination) => {
      const g = fakeGoogle();
      mockFetch({ body: { success: true, ...response } });
      const loc = { href: "" };
      vi.stubGlobal("location", loc);
      render(<GoogleAuthButton />);
      await waitFor(() => expect(g.callback).toBeTruthy());
      g.callback!({ credential: "tok" });
      await waitFor(() => expect(loc.href).toBe(destination));
    });

    it("shows the server's reason and stays put when sign-in is refused", async () => {
      const g = fakeGoogle();
      mockFetch({ ok: false, status: 401, body: { error: "Invalid or expired Google sign-in." } });
      const loc = { href: "" };
      vi.stubGlobal("location", loc);
      render(<GoogleAuthButton />);
      await waitFor(() => expect(g.callback).toBeTruthy());
      g.callback!({ credential: "tok" });
      expect(await screen.findByText("Invalid or expired Google sign-in.")).toBeTruthy();
      expect(loc.href).toBe("");
    });

    it("handles Google returning no credential", async () => {
      const g = fakeGoogle();
      const fetchFn = mockFetch({ body: {} });
      render(<GoogleAuthButton />);
      await waitFor(() => expect(g.callback).toBeTruthy());
      g.callback!({});
      expect(await screen.findByText(/did not return a sign-in/)).toBeTruthy();
      expect(fetchFn).not.toHaveBeenCalled();
    });
  });
});

/* ───────────────────────────── onboarding ───────────────────────────── */
describe("OnboardingClient (choose faculty and department)", () => {
  const faculty = ACADEMIC_STRUCTURE[0];
  const other = ACADEMIC_STRUCTURE[1];
  const view = () => render(<OnboardingClient name="Ada Obi" email="ada@gmail.com" />);
  const facultySelect = () => screen.getByLabelText("Faculty / School") as HTMLSelectElement;
  const departmentSelect = () => screen.getByLabelText("Department") as HTMLSelectElement;
  const submit = () => fireEvent.click(screen.getByRole("button", { name: /Continue to my courses/ }));

  it("welcomes the student by name and shows which account they are using", () => {
    view();
    expect(screen.getByText(/Welcome, Ada Obi/)).toBeTruthy();
    expect(screen.getByText(/ada@gmail\.com/)).toBeTruthy();
  });

  it("offers every real faculty and starts with nothing chosen", () => {
    view();
    expect(within(facultySelect()).getAllByRole("option")).toHaveLength(ACADEMIC_STRUCTURE.length + 1); // plus the prompt
    expect(facultySelect().value).toBe("");
    expect((screen.getByRole("button", { name: /Continue to my courses/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("the department list stays locked until a faculty is chosen", () => {
    view();
    expect(departmentSelect().disabled).toBe(true);
    expect(screen.getByText("Choose a faculty first")).toBeTruthy();
  });

  it("then lists only that faculty's departments", () => {
    view();
    fireEvent.change(facultySelect(), { target: { value: faculty.name } });
    expect(departmentSelect().disabled).toBe(false);
    const offered = within(departmentSelect()).getAllByRole("option").map((o) => o.textContent).filter((t) => !/Select your department/.test(t!));
    expect(offered).toEqual(faculty.departments);
  });

  it("changing the faculty clears a department that no longer belongs", () => {
    view();
    fireEvent.change(facultySelect(), { target: { value: faculty.name } });
    fireEvent.change(departmentSelect(), { target: { value: faculty.departments[0] } });
    expect(departmentSelect().value).toBe(faculty.departments[0]);
    fireEvent.change(facultySelect(), { target: { value: other.name } });
    expect(departmentSelect().value).toBe("");
  });

  it("saves the choice through the profile API and continues to the student's courses", async () => {
    const fetchFn = mockFetch({ body: { success: true } });
    const loc = { href: "" };
    vi.stubGlobal("location", loc);
    view();
    fireEvent.change(facultySelect(), { target: { value: faculty.name } });
    fireEvent.change(departmentSelect(), { target: { value: faculty.departments[1] } });
    submit();

    await waitFor(() => expect(loc.href).toBe("/my-courses"));
    expect(fetchFn.mock.calls[0][0]).toBe("/api/student/profile");
    expect(sentBody(fetchFn)).toEqual({ name: "Ada Obi", faculty: faculty.name, department: faculty.departments[1] });
  });

  it("shows the server's reason and keeps the choices if saving fails", async () => {
    mockFetch({ ok: false, status: 400, body: { error: "Please choose a department that belongs to your faculty." } });
    const loc = { href: "" };
    vi.stubGlobal("location", loc);
    view();
    fireEvent.change(facultySelect(), { target: { value: faculty.name } });
    fireEvent.change(departmentSelect(), { target: { value: faculty.departments[0] } });
    submit();
    expect(await screen.findByText("Please choose a department that belongs to your faculty.")).toBeTruthy();
    expect(loc.href).toBe("");
    expect(departmentSelect().value).toBe(faculty.departments[0]);
    expect((screen.getByRole("button", { name: /Continue to my courses/ }) as HTMLButtonElement).disabled).toBe(false); // can retry
  });
});
