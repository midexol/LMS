import { PASS_MARK_PERCENT } from "@/lib/grading";
export interface EnrollmentEmailData {
  studentName: string;
  courseTitle: string;
}

export interface GradeEmailData {
  studentName: string;
  courseTitle: string;
  assignmentTitle: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface GradeOverrideEmailData {
  studentName: string;
  courseTitle: string;
  assignmentTitle: string;
  newScore: number;
  maxScore: number;
  tutorFeedback: string;
}

export interface AnnouncementEmailData {
  studentName: string;
  courseTitle: string;
  announcementTitle: string;
  content: string;
}

export interface CourseUpdateEmailData {
  studentName: string;
  courseTitle: string;
  updateSummary: string;
}

export interface CompletionEmailData {
  studentName: string;
  courseTitle: string;
  certificateId?: string;
}

export interface PasswordResetEmailData {
  userName: string;
  resetUrl: string;
}

export interface VerificationEmailData {
  userName: string;
  verifyUrl: string;
}

export interface WelcomeEmailData {
  userName: string;
  dashboardUrl: string;
  faculty?: string | null;
  department?: string | null;
}

/**
 * Shared email shell: a white card on a soft background with a plum accent bar, the brand logo
 * and wordmark, a small label saying what the email is, the body, and a plain footer.
 * Built from tables and inline styles only, because email clients ignore most modern CSS.
 * No emojis anywhere. The logo is a PNG (email clients do not render SVG) served from the site;
 * without a configured site address it is skipped and the wordmark stands alone.
 */
function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
}

function renderEmailShell({ subtitle, bodyHtml }: { subtitle: string; bodyHtml: string }): string {
  const base = appUrl();
  const logo = base
    ? `<td style="padding-right: 12px; vertical-align: middle;"><img src="${base}/email-logo.png" width="44" height="44" alt="" style="display: block; border: 0; border-radius: 11px;" /></td>`
    : "";
  const siteLink = base
    ? `<a href="${base}" style="color: #4A1A45; text-decoration: none; font-weight: 600;">${base.replace(/^https?:\/\//, "")}</a>`
    : "";

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F4F0F4; padding: 32px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 14px; border: 1px solid #E6DCE5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <tr><td style="height: 5px; line-height: 5px; font-size: 0; background-color: #4A1A45; border-radius: 14px 14px 0 0;">&nbsp;</td></tr>
        <tr>
          <td style="padding: 28px 36px 20px 36px; border-bottom: 1px solid #EFE7EE;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${logo}
                <td style="vertical-align: middle;">
                  <div style="color: #2D0F2A; font-size: 20px; font-weight: 800; letter-spacing: 1.5px; line-height: 1.1;">ACADEMIA</div>
                  <div style="color: #8A6F87; font-size: 11px; font-weight: 600; letter-spacing: 0.8px; margin-top: 3px;">LEARNING MANAGEMENT SYSTEM</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px 36px 8px 36px;">
            <div style="color: #4A1A45; font-size: 12px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; margin: 0 0 18px 0;">${subtitle}</div>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 36px 28px 36px;">
            <div style="border-top: 1px solid #EFE7EE; padding-top: 18px; text-align: center;">
              <p style="color: #8F8590; font-size: 12px; line-height: 1.6; margin: 0;">
                Academia LMS${siteLink ? ` &middot; ${siteLink}` : ""}
              </p>
              <p style="color: #A89FA9; font-size: 11px; line-height: 1.6; margin: 6px 0 0 0;">
                You are receiving this email because of activity on your Academia account.
              </p>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `;
}

function renderPillButton(url: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 28px auto;">
      <tr>
        <td align="center" bgcolor="#4A1A45" style="background-color: #4A1A45; border-radius: 9999px;">
          <a href="${url}" style="display: inline-block; padding: 14px 34px; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 9999px;">${label}</a>
        </td>
      </tr>
    </table>
  `;
}

/* =========================================================================
 * 1. Verification Email
 * ========================================================================= */
export function getVerificationEmailTemplate(data: VerificationEmailData): { subject: string; html: string } {
  return {
    subject: "Verify Your Email Address - ACADEMIA LMS",
    html: renderEmailShell({
      subtitle: "Account Verification",
      bodyHtml: `
        <p style="color: #222222; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">Hello <strong>${data.userName}</strong>,</p>
        <p style="color: #444444; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          Welcome to ACADEMIA LMS. Please confirm your email address to activate your account and start your courses.
        </p>

        ${renderPillButton(data.verifyUrl, "Verify My Email Address")}

        <div style="background-color: #faf7fa; border: 1px solid #e9d5e7; border-radius: 10px; padding: 16px; margin: 24px 0;">
          <p style="color: #4A1A45; font-size: 12px; font-weight: 700; margin: 0 0 4px 0;">Security Notice</p>
          <p style="color: #665564; font-size: 12px; margin: 0; line-height: 1.5;">This verification link is valid for <strong>24 hours</strong>. If you did not create an account, you can safely ignore this email.</p>
        </div>

        <p style="color: #999999; font-size: 11px; margin-top: 24px;">If button doesn't work, copy and paste this link in your browser:<br/><span style="color: #555555; word-break: break-all;">${data.verifyUrl}</span></p>
      `,
    }),
  };
}

/* =========================================================================
 * 2. Welcome & Onboarding Email
 * ========================================================================= */
export function getWelcomeEmailTemplate(data: WelcomeEmailData): { subject: string; html: string } {
  return {
    subject: "Welcome to ACADEMIA LMS - Account Verified",
    html: renderEmailShell({
      subtitle: "Welcome",
      bodyHtml: `
        <p style="color: #222222; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">Hello <strong>${data.userName}</strong>,</p>
        <p style="color: #444444; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          Your email has been verified successfully. Your academic record is now active and ready for coursework.
        </p>

        ${
          data.department || data.faculty
            ? `
          <div style="background-color: #faf7fa; border: 1px solid #e9d5e7; border-radius: 10px; padding: 14px 18px; margin: 20px 0;">
            <p style="color: #4A1A45; font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 0 0 6px 0;">Academic Placement</p>
            ${data.faculty ? `<p style="color: #333333; font-size: 13px; margin: 2px 0;"><strong>Faculty:</strong> ${data.faculty}</p>` : ""}
            ${data.department ? `<p style="color: #333333; font-size: 13px; margin: 2px 0;"><strong>Department:</strong> ${data.department}</p>` : ""}
          </div>
        `
            : ""
        }

        <div style="background-color: #fbfbfb; border: 1px solid #eeeeee; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="color: #111111; font-size: 14px; font-weight: 800; margin: 0 0 12px 0;">Academic Progression Rules:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #444444; font-size: 13px; line-height: 1.8;">
            <li><strong>Course Selection:</strong> Browse faculty and department-approved courses.</li>
            <li><strong>Single Course Lock Policy:</strong> Focus on one course at a time to maximize subject mastery.</li>
            <li><strong>AI Auto-Grading Rubric:</strong> Submit assignments and receive instant criteria evaluation and feedback.</li>
            <li><strong>${PASS_MARK_PERCENT}% Certification Requirement:</strong> Pass with ${PASS_MARK_PERCENT}%+ to unlock your completion certificate and next courses.</li>
          </ul>
        </div>

        ${renderPillButton(data.dashboardUrl, "Access Student Dashboard")}
      `,
    }),
  };
}

/* =========================================================================
 * 3. Course Enrollment Confirmation
 * ========================================================================= */
export function getEnrollmentEmailTemplate(data: EnrollmentEmailData): { subject: string; html: string } {
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/my-courses`;
  return {
    subject: `Enrollment Confirmed: ${data.courseTitle}`,
    html: renderEmailShell({
      subtitle: "Enrollment Confirmed",
      bodyHtml: `
        <p style="color: #222222; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">Hello <strong>${data.studentName}</strong>,</p>
        <p style="color: #444444; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          Your registration for <strong>${data.courseTitle}</strong> has been successfully confirmed.
        </p>

        <div style="background-color: #faf7fa; border: 1px solid #e9d5e7; border-radius: 10px; padding: 18px; margin: 24px 0;">
          <p style="color: #4A1A45; font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 0 0 6px 0;">Academic Progression Policy</p>
          <p style="color: #555555; font-size: 13px; line-height: 1.6; margin: 0;">
            Single course lock is currently active. You must complete all lesson modules and pass all assignments with a minimum of ${PASS_MARK_PERCENT}% before enrolling in your next course.
          </p>
        </div>

        ${renderPillButton(portalUrl, "Open Course Player")}
      `,
    }),
  };
}

/* =========================================================================
 * 4. Assignment Graded (AI Evaluation)
 * ========================================================================= */
export function getGradeEmailTemplate(data: GradeEmailData): { subject: string; html: string } {
  const percentage = Math.round((data.score / data.maxScore) * 100);
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/my-courses`;

  return {
    subject: `Assignment Graded: ${data.assignmentTitle} (${data.score}/${data.maxScore})`,
    html: renderEmailShell({
      subtitle: "Assignment Evaluation",
      bodyHtml: `
        <p style="color: #222222; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">Hello <strong>${data.studentName}</strong>,</p>
        <p style="color: #444444; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          Your submission for <strong>${data.assignmentTitle}</strong> in <strong>${data.courseTitle}</strong> has been evaluated.
        </p>

        <div style="background-color: #fbfbfb; border: 1px solid #eeeeee; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <div style="display: inline-block; padding: 6px 16px; border-radius: 9999px; background-color: #4A1A45; color: #ffffff; font-size: 13px; font-weight: 800; margin-bottom: 14px;">
            Score: ${data.score} / ${data.maxScore} (${percentage}%)
          </div>

          <h4 style="color: #4A1A45; font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 12px 0 6px 0; letter-spacing: 0.5px;">
            Rubric Analysis &amp; Academic Feedback:
          </h4>
          <p style="color: #333333; font-size: 13px; white-space: pre-wrap; line-height: 1.6; margin: 0; background-color: #ffffff; padding: 14px; border-radius: 8px; border: 1px solid #e5e5e5;">
            ${data.feedback}
          </p>
        </div>

        <p style="color: #666666; font-size: 13px; margin: 16px 0;">
          Unlimited resubmissions are supported directly in your course player to help you refine and master the concepts.
        </p>

        ${renderPillButton(portalUrl, "View Assignment in Course Player")}
      `,
    }),
  };
}

/* =========================================================================
 * 5. Instructor Grade Override
 * ========================================================================= */
export function getGradeOverrideEmailTemplate(data: GradeOverrideEmailData): { subject: string; html: string } {
  const percentage = Math.round((data.newScore / data.maxScore) * 100);
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/my-courses`;

  return {
    subject: `Instructor Feedback Update: ${data.assignmentTitle} (${data.newScore}/${data.maxScore})`,
    html: renderEmailShell({
      subtitle: "Instructor Evaluation Review",
      bodyHtml: `
        <p style="color: #222222; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">Hello <strong>${data.studentName}</strong>,</p>
        <p style="color: #444444; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          Your instructor has reviewed your submission for <strong>${data.assignmentTitle}</strong> in <strong>${data.courseTitle}</strong> and updated your evaluation.
        </p>

        <div style="background-color: #fbfbfb; border: 1px solid #eeeeee; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <div style="display: inline-block; padding: 6px 16px; border-radius: 9999px; background-color: #4A1A45; color: #ffffff; font-size: 13px; font-weight: 800; margin-bottom: 14px;">
            Updated Score: ${data.newScore} / ${data.maxScore} (${percentage}%)
          </div>

          ${
            data.tutorFeedback
              ? `
            <h4 style="color: #4A1A45; font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 12px 0 6px 0; letter-spacing: 0.5px;">
              Instructor Note:
            </h4>
            <p style="color: #222222; font-size: 13px; font-weight: 500; white-space: pre-wrap; line-height: 1.6; margin: 0; background-color: #ffffff; padding: 14px; border-radius: 8px; border: 1px solid #e5e5e5;">
              ${data.tutorFeedback}
            </p>
          `
              : ""
          }
        </div>

        ${renderPillButton(portalUrl, "View Updated Academic Record")}
      `,
    }),
  };
}

/* =========================================================================
 * 6. Course Announcement
 * ========================================================================= */
export function getAnnouncementEmailTemplate(data: AnnouncementEmailData): { subject: string; html: string } {
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/my-courses`;

  return {
    subject: `Course Announcement: ${data.announcementTitle} [${data.courseTitle}]`,
    html: renderEmailShell({
      subtitle: "Course Announcement",
      bodyHtml: `
        <p style="color: #222222; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">Hello <strong>${data.studentName}</strong>,</p>
        <p style="color: #444444; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          An important announcement has been posted for <strong>${data.courseTitle}</strong>:
        </p>

        <div style="background-color: #faf7fa; border: 1px solid #e9d5e7; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #4A1A45; font-size: 16px; font-weight: 800; margin: 0 0 10px 0;">${data.announcementTitle}</h3>
          <p style="color: #333333; font-size: 14px; white-space: pre-wrap; line-height: 1.6; margin: 0;">${data.content}</p>
        </div>

        ${renderPillButton(portalUrl, "Go to Course Portal")}
      `,
    }),
  };
}

/* =========================================================================
 * 7. Curriculum Update
 * ========================================================================= */
export function getCourseUpdateEmailTemplate(data: CourseUpdateEmailData): { subject: string; html: string } {
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/my-courses`;

  return {
    subject: `Curriculum Update: ${data.courseTitle}`,
    html: renderEmailShell({
      subtitle: "Curriculum & Syllabus Update",
      bodyHtml: `
        <p style="color: #222222; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">Hello <strong>${data.studentName}</strong>,</p>
        <p style="color: #444444; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          Your instructor has updated syllabus materials for <strong>${data.courseTitle}</strong>:
        </p>

        <div style="background-color: #fbfbfb; border: 1px solid #eeeeee; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="color: #222222; font-size: 14px; line-height: 1.6; margin: 0;">${data.updateSummary}</p>
        </div>

        ${renderPillButton(portalUrl, "Review Latest Course Materials")}
      `,
    }),
  };
}

/* =========================================================================
 * 8. Course Completion & Certificate
 * ========================================================================= */
export function getCompletionEmailTemplate(data: CompletionEmailData): { subject: string; html: string } {
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/my-courses`;

  return {
    subject: `Certificate Awarded: Completed ${data.courseTitle}`,
    html: renderEmailShell({
      subtitle: "Course Completed",
      bodyHtml: `
        <p style="color: #222222; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">Hearty congratulations, <strong>${data.studentName}</strong>!</p>
        <p style="color: #444444; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          You have satisfied all academic requirements, passed all evaluations, and successfully completed <strong>${data.courseTitle}</strong>.
        </p>

        <div style="background-color: #faf7fa; border: 1px solid #e9d5e7; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
          <div style="color: #8A6F87; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; margin-bottom: 8px;">CERTIFICATE OF COMPLETION</div>
          <h3 style="color: #4A1A45; font-size: 18px; font-weight: 800; margin: 0 0 8px 0;">Your Completion Certificate Is Ready</h3>
          ${
            data.certificateId
              ? `<p style="font-family: monospace; font-size: 12px; color: #4A1A45; font-weight: 700; margin: 0 0 12px 0;">Certificate ID: ${data.certificateId}</p>`
              : ""
          }
          <p style="color: #555555; font-size: 13px; line-height: 1.6; margin: 0;">
            Your single-course lock has now been released. You may view or print your certificate directly from your student portal and enroll in your next course.
          </p>
        </div>

        ${renderPillButton(portalUrl, "View Your Certificate")}
      `,
    }),
  };
}

/* =========================================================================
 * 9. Password Reset
 * ========================================================================= */
export function getPasswordResetEmailTemplate(data: PasswordResetEmailData): { subject: string; html: string } {
  return {
    subject: "Reset Your Account Password - ACADEMIA LMS",
    html: renderEmailShell({
      subtitle: "Security Notification",
      bodyHtml: `
        <p style="color: #222222; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">Hello <strong>${data.userName}</strong>,</p>
        <p style="color: #444444; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          We received a request to reset your password for your ACADEMIA LMS account. Click below to choose a new password:
        </p>

        ${renderPillButton(data.resetUrl, "Reset My Password")}

        <div style="background-color: #faf7fa; border: 1px solid #e9d5e7; border-radius: 10px; padding: 14px 16px; margin: 24px 0;">
          <p style="color: #665564; font-size: 12px; margin: 0; line-height: 1.5;">This password reset link is valid for <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email; your account remains secure.</p>
        </div>

        <p style="color: #999999; font-size: 11px; margin-top: 24px;">If button doesn't work, copy and paste this link in your browser:<br/><span style="color: #555555; word-break: break-all;">${data.resetUrl}</span></p>
      `,
    }),
  };
}


export interface InstructorInviteEmailData {
  userName: string;
  inviteUrl: string;
  loginUrl: string;
}

/**
 * Sent when an administrator adds someone as an instructor. The link lets them set their own password,
 * so no password is ever emailed or chosen by the admin.
 */
export function getInstructorInviteEmailTemplate(data: InstructorInviteEmailData): { subject: string; html: string } {
  return {
    subject: "You have been added as an instructor - ACADEMIA LMS",
    html: renderEmailShell({
      subtitle: "Instructor Account",
      bodyHtml: `
        <p style="color: #222222; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">Hello <strong>${data.userName}</strong>,</p>
        <p style="color: #444444; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          An administrator has added you as an instructor on ACADEMIA LMS. Set your password to get started:
        </p>

        ${renderPillButton(data.inviteUrl, "Set My Password")}

        <div style="background-color: #faf7fa; border: 1px solid #e9d5e7; border-radius: 10px; padding: 14px 16px; margin: 24px 0;">
          <p style="color: #665564; font-size: 12px; margin: 0; line-height: 1.5;">This link is valid for <strong>3 days</strong>. After setting your password, sign in at the instructor login page: <span style="color: #555555; word-break: break-all;">${data.loginUrl}</span></p>
        </div>

        <p style="color: #999999; font-size: 11px; margin-top: 24px;">If the button doesn't work, copy and paste this link in your browser:<br/><span style="color: #555555; word-break: break-all;">${data.inviteUrl}</span></p>
      `,
    }),
  };
}
