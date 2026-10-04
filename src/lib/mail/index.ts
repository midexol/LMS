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
} from "./templates";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || "587");
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || "no-reply@lms-platform.com";

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
  const { subject, html } = getEnrollmentEmailTemplate(data);
  return await sendEmailNotification(studentEmail, subject, html);
}

export async function sendGradeEmail(studentEmail: string, data: GradeEmailData) {
  const { subject, html } = getGradeEmailTemplate(data);
  return await sendEmailNotification(studentEmail, subject, html);
}

export async function sendGradeOverrideEmail(studentEmail: string, data: GradeOverrideEmailData) {
  const { subject, html } = getGradeOverrideEmailTemplate(data);
  return await sendEmailNotification(studentEmail, subject, html);
}

export async function sendAnnouncementEmail(studentEmail: string, data: AnnouncementEmailData) {
  const { subject, html } = getAnnouncementEmailTemplate(data);
  return await sendEmailNotification(studentEmail, subject, html);
}

export async function sendCourseUpdateEmail(studentEmail: string, data: CourseUpdateEmailData) {
  const { subject, html } = getCourseUpdateEmailTemplate(data);
  return await sendEmailNotification(studentEmail, subject, html);
}

export async function sendCompletionEmail(studentEmail: string, data: CompletionEmailData) {
  const { subject, html } = getCompletionEmailTemplate(data);
  return await sendEmailNotification(studentEmail, subject, html);
}

