import { describe, it, expect, vi, afterEach } from "vitest";
import "../helpers/mocks";
import InstructorJoinPage from "@/app/join/instructor/page";

const KEY = "a-long-private-key-1234567890";

afterEach(() => vi.unstubAllEnvs());

describe("/join/instructor (private sign-up page)", () => {
  it("does not exist for anyone without the right key", () => {
    vi.stubEnv("INSTRUCTOR_SIGNUP_KEY", KEY);
    expect(() => InstructorJoinPage({ searchParams: {} })).toThrow();
    expect(() => InstructorJoinPage({ searchParams: { key: "wrong" } })).toThrow();
    expect(() => InstructorJoinPage({ searchParams: { key: [""] } })).toThrow();
  });

  it("does not exist for anyone when no key is configured", () => {
    vi.stubEnv("INSTRUCTOR_SIGNUP_KEY", "");
    expect(() => InstructorJoinPage({ searchParams: { key: KEY } })).toThrow();
  });

  it("shows the form, with the key passed along, to someone holding the link", () => {
    vi.stubEnv("INSTRUCTOR_SIGNUP_KEY", KEY);
    const el: any = InstructorJoinPage({ searchParams: { key: KEY } });
    expect(el.props.accessKey).toBe(KEY);
  });
});
