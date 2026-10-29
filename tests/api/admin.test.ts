import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { prismaMock, mailMock } from "../helpers/mocks";
import { call, loginAs } from "../helpers/http";

import { GET as listUsers, POST as addInstructor, PATCH as patchUser, DELETE as deleteUser } from "@/app/api/admin/users/route";
import { PATCH as patchCourse, DELETE as deleteCourse } from "@/app/api/admin/courses/route";
import { DELETE as revokeEnrollment } from "@/app/api/admin/enrollments/route";
import { PATCH as patchMessage, DELETE as deleteMessage } from "@/app/api/admin/contact-messages/route";
import { POST as contact } from "@/app/api/contact/route";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

/** Every admin endpoint must refuse everyone who is not an admin. */
describe("admin access control", () => {
  const endpoints: Array<[string, () => Promise<{ status: number }>]> = [
    ["GET /admin/users", () => call(listUsers, "/api/admin/users", { method: "GET" })],
    ["POST /admin/users", () => call(addInstructor, "/api/admin/users", { body: { name: "Dr A", email: "a@test.com" } })],
    ["PATCH /admin/users", () => call(patchUser, "/api/admin/users", { method: "PATCH", body: { userId: "u", role: "ADMIN" } })],
    ["DELETE /admin/users", () => call(deleteUser, "/api/admin/users?id=u", { method: "DELETE" })],
    ["PATCH /admin/courses", () => call(patchCourse, "/api/admin/courses", { method: "PATCH", body: { courseId: "c" } })],
    ["DELETE /admin/courses", () => call(deleteCourse, "/api/admin/courses?id=c", { method: "DELETE" })],
    ["DELETE /admin/enrollments", () => call(revokeEnrollment, "/api/admin/enrollments?id=e", { method: "DELETE" })],
    ["PATCH /admin/contact-messages", () => call(patchMessage, "/api/admin/contact-messages", { method: "PATCH", body: { id: "m", status: "READ" } })],
    ["DELETE /admin/contact-messages", () => call(deleteMessage, "/api/admin/contact-messages?id=m", { method: "DELETE" })],
  ];

  for (const [name, run] of endpoints) {
    it(`${name} refuses visitors, students and tutors with 403`, async () => {
      for (const who of [null, "STUDENT", "TUTOR"] as const) {
        loginAs(who);
        expect((await run()).status, `${name} as ${who}`).toBe(403);
      }
      // nothing was written
      expect(prismaMock.user.create).not.toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
      expect(prismaMock.course.delete).not.toHaveBeenCalled();
    });
  }
});

describe("GET /api/admin/users", () => {
  it("lists users for an admin, without password fields", async () => {
    loginAs("ADMIN");
    prismaMock.user.findMany.mockResolvedValue([{ id: "u1", name: "A", email: "a@test.com", role: "STUDENT" }]);
    const { status, body } = await call(listUsers, "/api/admin/users", { method: "GET" });
    expect(status).toBe(200);
    expect(body.users).toHaveLength(1);
    expect(prismaMock.user.findMany.mock.calls[0][0].select).not.toHaveProperty("password");
  });
});

describe("POST /api/admin/users (add instructor)", () => {
  const add = (body: unknown) => call(addInstructor, "/api/admin/users", { body });
  const valid = { name: " Dr. Ade ", email: " Ade@Test.com ", faculty: "Science", department: "Chemistry" };

  beforeEach(() => {
    loginAs("ADMIN", { email: "boss@test.com" });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(async ({ data }: any) => ({ id: "tutor_new", ...data }));
    prismaMock.user.update.mockImplementation(async ({ data, where }: any) => ({ id: where.id, name: "Existing", email: "ade@test.com", ...data }));
  });

  it("validates name and email", async () => {
    expect((await add({ ...valid, name: "A" })).status).toBe(400);
    expect((await add({ ...valid, name: "x".repeat(81) })).status).toBe(400);
    expect((await add({ ...valid, email: "nope" })).status).toBe(400);
    expect((await add({ ...valid, email: undefined })).status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("creates a verified TUTOR with an unusable password and a 3-day invite token", async () => {
    const { status, body } = await add(valid);
    expect(status).toBe(200);
    expect(body).toMatchObject({ success: true, created: true, emailSent: true });

    const data = prismaMock.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ name: "Dr. Ade", email: "ade@test.com", role: "TUTOR", emailVerified: true, faculty: "Science", department: "Chemistry" });
    expect(data.resetToken).toMatch(/^[0-9a-f]{64}$/);
    const ttl = data.resetTokenExpiry.getTime() - Date.now();
    expect(ttl).toBeGreaterThan(71 * 3600_000);
    expect(ttl).toBeLessThanOrEqual(72 * 3600_000);
    // nobody (including the admin) knows the placeholder password
    expect(data.password.startsWith("$2")).toBe(true);
    expect(await bcrypt.compare("password", data.password)).toBe(false);
  });

  it("emails an invite whose link lets them set their own password, on our domain", async () => {
    await add(valid);
    const [to, data] = mailMock.sendInstructorInviteEmail.mock.calls[0];
    const token = prismaMock.user.create.mock.calls[0][0].data.resetToken;
    expect(to).toBe("ade@test.com");
    expect(data).toMatchObject({
      userName: "Dr. Ade",
      inviteUrl: `https://lms.test/reset-password?token=${token}`,
      loginUrl: "https://lms.test/instructor/login",
    });
  });

  it("tells the admin when the invite email could not be sent", async () => {
    mailMock.sendInstructorInviteEmail.mockResolvedValue(false);
    const { status, body } = await add(valid);
    expect(status).toBe(200);
    expect(body.emailSent).toBe(false);
  });

  it("promotes an existing student instead of creating a duplicate", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "stu_1", role: "STUDENT", email: "ade@test.com" });
    const { status, body } = await add(valid);
    expect(status).toBe(200);
    expect(body.created).toBe(false);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update.mock.calls[0][0]).toMatchObject({ where: { id: "stu_1" }, data: { role: "TUTOR", faculty: "Science" } });
    expect(mailMock.sendInstructorInviteEmail).not.toHaveBeenCalled();
  });

  it("does not demote or hijack existing instructors and admins", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "t", role: "TUTOR" });
    expect((await add(valid)).status).toBe(409);
    for (const role of ["ADMIN", "SUPERADMIN"]) {
      prismaMock.user.findUnique.mockResolvedValue({ id: "a", role });
      expect((await add(valid)).status).toBe(409);
    }
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("writes an audit line naming the admin", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await add(valid);
    expect(info.mock.calls.flat().join(" ")).toMatch(/ADMIN AUDIT.*boss@test\.com.*ade@test\.com/);
  });

  it("works for super admins too", async () => {
    loginAs("SUPERADMIN");
    expect((await add(valid)).status).toBe(200);
  });
});

describe("PATCH /api/admin/users", () => {
  const patch = (body: unknown) => call(patchUser, "/api/admin/users", { method: "PATCH", body });
  let admin: ReturnType<typeof loginAs>;

  beforeEach(() => {
    admin = loginAs("ADMIN");
    prismaMock.user.update.mockImplementation(async ({ data, where }: any) => ({ id: where.id, role: "STUDENT", faculty: null, department: null, ...data }));
  });

  it("needs a user id and a valid role", async () => {
    expect((await patch({ role: "TUTOR" })).status).toBe(400);
    expect((await patch({ userId: "u1", role: "GOD" })).status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("changes a user's role", async () => {
    const { status, body } = await patch({ userId: "u1", role: "TUTOR" });
    expect(status).toBe(200);
    expect(body.user.role).toBe("TUTOR");
  });

  it("stops an admin demoting themselves", async () => {
    const { status } = await patch({ userId: admin!.id, role: "STUDENT" });
    expect(status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("resets a password with a hash and signs that user out everywhere", async () => {
    await patch({ userId: "u1", newPassword: "fresh-pass-1" });
    const data = prismaMock.user.update.mock.calls[0][0].data;
    expect(await bcrypt.compare("fresh-pass-1", data.password)).toBe(true);
    expect(data.sessionsValidAfter).toBeInstanceOf(Date);
  });

  it("rejects a password reset under 10 characters", async () => {
    expect((await patch({ userId: "u1", newPassword: "123" })).status).toBe(400);
  });

  it("updates faculty and department, and can clear them", async () => {
    await patch({ userId: "u1", faculty: " Science ", department: "" });
    const data = prismaMock.user.update.mock.calls[0][0].data;
    expect(data.faculty).toBe("Science");
    expect(data.department).toBeNull();
  });
});

describe("DELETE /api/admin/users", () => {
  it("deletes another user but never yourself", async () => {
    const admin = loginAs("ADMIN")!;
    expect((await call(deleteUser, "/api/admin/users", { method: "DELETE" })).status).toBe(400);
    expect((await call(deleteUser, `/api/admin/users?id=${admin.id}`, { method: "DELETE" })).status).toBe(400);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();

    expect((await call(deleteUser, "/api/admin/users?id=other", { method: "DELETE" })).status).toBe(200);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "other" } });
  });
});

describe("/api/admin/courses", () => {
  beforeEach(() => loginAs("ADMIN"));

  it("PATCH publishes or unpublishes a course", async () => {
    prismaMock.course.update.mockResolvedValue({ id: "c1", title: "Bio", published: false });
    expect((await call(patchCourse, "/api/admin/courses", { method: "PATCH", body: {} })).status).toBe(400);
    const { status, body } = await call(patchCourse, "/api/admin/courses", { method: "PATCH", body: { courseId: "c1", published: false } });
    expect(status).toBe(200);
    expect(body.course.published).toBe(false);
    expect(prismaMock.course.update.mock.calls[0][0].data).toEqual({ published: false });
  });

  it("DELETE removes a course by id", async () => {
    expect((await call(deleteCourse, "/api/admin/courses", { method: "DELETE" })).status).toBe(400);
    expect((await call(deleteCourse, "/api/admin/courses?id=c1", { method: "DELETE" })).status).toBe(200);
    expect(prismaMock.course.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });
});

describe("DELETE /api/admin/enrollments (release the one-course lock)", () => {
  beforeEach(() => loginAs("ADMIN"));

  it("needs an id and an existing enrollment", async () => {
    expect((await call(revokeEnrollment, "/api/admin/enrollments", { method: "DELETE" })).status).toBe(400);
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    expect((await call(revokeEnrollment, "/api/admin/enrollments?id=e1", { method: "DELETE" })).status).toBe(404);
  });

  it("removes the enrollment and that student's lesson progress together", async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue({
      id: "e1",
      studentId: "stu_1",
      course: { modules: [{ lessons: [{ id: "l1" }, { id: "l2" }] }] },
    });
    const { status } = await call(revokeEnrollment, "/api/admin/enrollments?id=e1", { method: "DELETE" });
    expect(status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(prismaMock.lessonProgress.deleteMany).toHaveBeenCalledWith({ where: { studentId: "stu_1", lessonId: { in: ["l1", "l2"] } } });
    expect(prismaMock.enrollment.delete).toHaveBeenCalledWith({ where: { id: "e1" } });
  });
});

describe("/api/admin/contact-messages (inbox)", () => {
  beforeEach(() => loginAs("ADMIN"));

  it("marks a message read or unread", async () => {
    prismaMock.contactMessage.update.mockImplementation(async ({ data }: any) => ({ id: "m1", ...data }));
    const { status, body } = await call(patchMessage, "/api/admin/contact-messages", { method: "PATCH", body: { id: "m1", status: "READ" } });
    expect(status).toBe(200);
    expect(body.message.status).toBe("READ");
  });

  it("rejects invalid statuses and missing ids", async () => {
    expect((await call(patchMessage, "/api/admin/contact-messages", { method: "PATCH", body: { id: "m1", status: "ARCHIVED" } })).status).toBe(400);
    expect((await call(patchMessage, "/api/admin/contact-messages", { method: "PATCH", body: { status: "READ" } })).status).toBe(400);
  });

  it("deletes a message", async () => {
    expect((await call(deleteMessage, "/api/admin/contact-messages", { method: "DELETE" })).status).toBe(400);
    expect((await call(deleteMessage, "/api/admin/contact-messages?id=m1", { method: "DELETE" })).status).toBe(200);
    expect(prismaMock.contactMessage.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
  });
});

/* ───────────────────────────── public contact form ───────────────────────────── */
describe("POST /api/contact", () => {
  const valid = { name: "Visitor One", email: "Visitor@Test.com", subject: "Enrollment & Account Access", message: "I cannot access my course after paying." };
  const send = (body: unknown, ip?: string) => call(contact, "/api/contact", { body, ip });

  beforeEach(() => {
    prismaMock.contactMessage.create.mockResolvedValue({});
  });

  it("saves a valid message for the admin inbox (no login needed)", async () => {
    loginAs(null);
    const { status, body } = await send(valid);
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(prismaMock.contactMessage.create).toHaveBeenCalledWith({
      data: { name: "Visitor One", email: "visitor@test.com", subject: "Enrollment & Account Access", message: "I cannot access my course after paying." },
    });
  });

  it("falls back to a general topic for unknown subjects (no arbitrary text in the subject)", async () => {
    await send({ ...valid, subject: "<script>alert(1)</script>" });
    expect(prismaMock.contactMessage.create.mock.calls[0][0].data.subject).toBe("General Question");
  });

  it("accepts the 'Teaching on Academia' topic used by prospective instructors", async () => {
    await send({ ...valid, subject: "Teaching on Academia" });
    expect(prismaMock.contactMessage.create.mock.calls[0][0].data.subject).toBe("Teaching on Academia");
  });

  it.each([
    ["a missing name", { name: "" }, /full name/],
    ["a one-letter name", { name: "A" }, /full name/],
    ["a 101-character name", { name: "x".repeat(101) }, /full name/],
    ["an invalid email", { email: "no-at-sign" }, /valid email/],
    ["a too-short message", { message: "hi" }, /10 and 2000/],
    ["a 2001-character message", { message: "x".repeat(2001) }, /10 and 2000/],
  ])("rejects %s", async (_l, patch, message) => {
    const { status, body } = await send({ ...valid, ...patch });
    expect(status).toBe(400);
    expect(body.error).toMatch(message);
    expect(prismaMock.contactMessage.create).not.toHaveBeenCalled();
  });

  it("silently drops bot submissions that fill the hidden honeypot field", async () => {
    const { status, body } = await send({ ...valid, website: "http://spam.example" });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(prismaMock.contactMessage.create).not.toHaveBeenCalled();
  });

  it("limits each visitor to 5 messages per hour", async () => {
    const ip = "203.0.113.99";
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await send(valid, ip)).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it("returns a generic error if saving fails", async () => {
    prismaMock.contactMessage.create.mockRejectedValue(new Error("relation does not exist"));
    const { status, body } = await send(valid);
    expect(status).toBe(500);
    expect(body.error).toBe("Failed to send your message.");
  });
});
