// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { InstructorJoinForm } from "@/app/join/instructor/InstructorJoinForm";

const KEY = "a-long-private-key-1234567890";

beforeEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const fill = () => {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Dr Ade Bello" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ade@test.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "long-enough-pw" } });
  fireEvent.change(screen.getByLabelText("Faculty / School"), { target: { value: "Business Studies" } });
  fireEvent.change(screen.getByLabelText("Department"), { target: { value: "Marketing" } });
};

describe("InstructorJoinForm", () => {
  it("keeps the button off until every detail is filled in, and the password is long enough", () => {
    render(<InstructorJoinForm accessKey={KEY} />);
    const button = screen.getByRole("button", { name: "Create instructor account" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fill();
    expect(button.disabled).toBe(false);
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "short" } });
    expect(button.disabled).toBe(true);
  });

  it("only offers the departments of the chosen school", () => {
    render(<InstructorJoinForm accessKey={KEY} />);
    expect((screen.getByLabelText("Department") as HTMLSelectElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Faculty / School"), { target: { value: "Business Studies" } });
    expect(screen.getByRole("option", { name: "Marketing" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Accountancy" })).toBeNull();
  });

  it("sends the details with the key from the link to the sign-up endpoint", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "An account with this email already exists." }) });
    vi.stubGlobal("fetch", fetchFn);
    render(<InstructorJoinForm accessKey={KEY} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Create instructor account" }));

    expect(await screen.findByText("An account with this email already exists.")).toBeTruthy();
    expect(fetchFn.mock.calls[0][0]).toBe("/api/auth/instructor-signup");
    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual({
      key: KEY, name: "Dr Ade Bello", email: "ade@test.com", password: "long-enough-pw", faculty: "Business Studies", department: "Marketing",
    });
  });

  it("shows the server's message when the link is refused", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "This sign-up link is not valid." }) }));
    render(<InstructorJoinForm accessKey="old-key" />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Create instructor account" }));
    await waitFor(() => expect(screen.getByText("This sign-up link is not valid.")).toBeTruthy());
  });
});
