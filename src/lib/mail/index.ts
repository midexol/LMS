import nodemailer from "nodemailer";
import {
  EnrollmentEmailData,
  GradeEmailData,
  GradeOverrideEmailData,
  AnnouncementEmailData,
  CourseUpdateEmailData,
  CompletionEmailData,
  getEnrollmentEmailTemplate,
  getGradeEmailTemplate,
  getGradeOverrideEmailTemplate,
  getAnnouncementEmailTemplate,
  getCourseUpdateEmailTemplate,
  getCompletionEmailTemplate,
  getInstructorInviteEmailTemplate,
  InstructorInviteEmailData,
} from "./templates";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || "587");
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
// Never invent a sender domain: use the configured address, or the SMTP login itself
const smtpFrom = process.env.SMTP_FROM || smtpUser;

const isRealSmtp =
  Boolean(smtpHost && smtpUser && smtpPass) &&
  smtpHost !== "smtp.example.com" &&
  smtpUser !== "user@example.com" &&
  smtpPass !== "password";

const transporter = isRealSmtp
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders a template with user-supplied text (names, titles, feedback) HTML-escaped in the body,
 * so a name like "<a href=...>" cannot inject markup. Subjects are plain text and use raw values.
 * Fields ending in "Url" are generated server-side and left as-is.
 */
function renderTemplate<T extends object>(
  template: (data: T) => { subject: string; html: string },
  data: T
): { subject: string; html: string } {
  const escaped = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      typeof value === "string" && !key.endsWith("Url") ? escapeHtml(value) : value,
    ])
  ) as T;
  return { subject: template(data).subject, html: template(escaped).html };
}

export async function sendEmailNotification(toEmail: string, subject: string, htmlContent: string) {
  if (!transporter) {
    console.log("==========================================");
    console.log("[MOCK MAIL DISPATCHER] To:", toEmail);
    console.log("[MOCK MAIL DISPATCHER] Subject:", subject);
    console.log("[MOCK MAIL DISPATCHER] Content:");
    console.log(htmlContent.replace(/<[^>]*>?/gm, ""));
    console.log("==========================================");
    return true;
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: subject,
      html: htmlContent,
    });
    console.log(`[EMAIL DISPATCHED] Successfully sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error("[EMAIL ERROR] Failed to send email:", error);
    return false;
  }
}

export async function sendEnrollmentEmail(studentEmail: string, data: EnrollmentEmailData) {
  const { subject, html } = renderTemplate(getEnrollmentEmailTemplate, data);
  return await sendEmailNotification(studentEmail, subject, html);
}

export async function sendGradeEmail(studentEmail: string, data: GradeEmailData) {
  const { subject, html } = renderTemplate(getGradeEmailTemplate, data);
  return await sendEmailNotification(studentEmail, subject, html);
}

export async function sendGradeOverrideEmail(studentEmail: string, data: GradeOverrideEmailData) {
  const { subject, html } = renderTemplate(getGradeOverrideEmailTemplate, data);
  return await sendEmailNotification(studentEmail, subject, html);
}

export async function sendAnnouncementEmail(studentEmail: string, data: AnnouncementEmailData) {
  const { subject, html } = renderTemplate(getAnnouncementEmailTemplate, data);
  return await sendEmailNotification(studentEmail, subject, html);
}

export async function sendCourseUpdateEmail(studentEmail: string, data: CourseUpdateEmailData) {
  const { subject, html } = renderTemplate(getCourseUpdateEmailTemplate, data);
  return await sendEmailNotification(studentEmail, subject, html);
}

export async function sendCompletionEmail(studentEmail: string, data: CompletionEmailData) {
  const { subject, html } = renderTemplate(getCompletionEmailTemplate, data);
  return await sendEmailNotification(studentEmail, subject, html);
}

export async function sendPasswordResetEmail(userEmail: string, data: { userName: string; resetUrl: string }) {
  const { getPasswordResetEmailTemplate } = await import("./templates");
  const { subject, html } = renderTemplate(getPasswordResetEmailTemplate, data);
  return await sendEmailNotification(userEmail, subject, html);
}

export async function sendVerificationEmail(userEmail: string, data: { userName: string; verifyUrl: string }) {
  const { getVerificationEmailTemplate } = await import("./templates");
  const { subject, html } = renderTemplate(getVerificationEmailTemplate, data);
  return await sendEmailNotification(userEmail, subject, html);
}

export async function sendWelcomeEmail(
  userEmail: string,
  data: { userName: string; dashboardUrl: string; faculty?: string | null; department?: string | null }
) {
  const { getWelcomeEmailTemplate } = await import("./templates");
  const { subject, html } = renderTemplate(getWelcomeEmailTemplate, data);
  return await sendEmailNotification(userEmail, subject, html);
}

export async function sendInstructorInviteEmail(userEmail: string, data: InstructorInviteEmailData) {
  const { subject, html } = renderTemplate(getInstructorInviteEmailTemplate, data);
  return await sendEmailNotification(userEmail, subject, html);
}
