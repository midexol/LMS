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

export function getEnrollmentEmailTemplate(data: EnrollmentEmailData): { subject: string; html: string } {
  return {
    subject: `Enrollment Confirmed: ${data.courseTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 16px; background-color: #ffffff; color: #000000;">
        <div style="border-bottom: 2px solid #000000; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #000000; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">ACADEMIA LMS</h1>
          <p style="color: #784D28; font-size: 12px; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase;">Official Enrollment Notice</p>
        </div>
        <p style="color: #333333; font-size: 15px; line-height: 1.6;">Hello <strong>${data.studentName}</strong>,</p>
        <p style="color: #333333; font-size: 15px; line-height: 1.6;">Your registration for <strong>${data.courseTitle}</strong> has been successfully confirmed.</p>
        <div style="background-color: #fafafa; padding: 16px; border-radius: 12px; margin: 24px 0; border: 1px solid #e5e5e5;">
          <p style="color: #000000; margin: 0; font-size: 13px; font-weight: 700;">Academic Progression Policy:</p>
          <p style="color: #555555; margin: 6px 0 0 0; font-size: 13px; line-height: 1.5;">Single course lock is currently active. You must complete all lesson modules and pass all assignments with a minimum of 70% before registering for your next course.</p>
        </div>
        <p style="color: #777777; font-size: 13px;">Log in to your student portal to begin learning.</p>
      </div>
    `,
  };
}

export function getGradeEmailTemplate(data: GradeEmailData): { subject: string; html: string } {
  const percentage = Math.round((data.score / data.maxScore) * 100);
  return {
    subject: `Assignment Graded: ${data.assignmentTitle} (${data.score}/${data.maxScore})`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 16px; background-color: #ffffff; color: #000000;">
        <div style="border-bottom: 2px solid #000000; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #000000; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">ACADEMIA LMS</h1>
          <p style="color: #784D28; font-size: 12px; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase;">Assignment Evaluation</p>
        </div>
        <p style="color: #333333; font-size: 15px; line-height: 1.6;">Hello <strong>${data.studentName}</strong>,</p>
        <p style="color: #333333; font-size: 15px; line-height: 1.6;">Your assignment <strong>${data.assignmentTitle}</strong> in <strong>${data.courseTitle}</strong> has been evaluated.</p>
        
        <div style="background-color: #fafafa; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e5e5;">
          <div style="display: inline-block; padding: 4px 12px; border-radius: 999px; background-color: #000000; color: #ffffff; font-size: 13px; font-weight: 800; margin-bottom: 12px;">
            Score: ${data.score} / ${data.maxScore} (${percentage}%)
          </div>
          <h4 style="color: #784D28; font-size: 12px; text-transform: uppercase; margin: 12px 0 6px 0; letter-spacing: 0.5px;">AI Feedback &amp; Rubric Analysis:</h4>
          <p style="color: #444444; font-size: 13px; white-space: pre-wrap; line-height: 1.6; margin: 0;">${data.feedback}</p>
        </div>
        
        <p style="color: #777777; font-size: 13px;">If you want to improve your score, unlimited resubmissions are supported directly in the course player.</p>
      </div>
    `,
  };
}

export function getGradeOverrideEmailTemplate(data: GradeOverrideEmailData): { subject: string; html: string } {
  const percentage = Math.round((data.newScore / data.maxScore) * 100);
  return {
    subject: `Instructor Feedback Update: ${data.assignmentTitle} (${data.newScore}/${data.maxScore})`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 16px; background-color: #ffffff; color: #000000;">
        <div style="border-bottom: 2px solid #000000; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #000000; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">ACADEMIA LMS</h1>
          <p style="color: #784D28; font-size: 12px; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase;">Instructor Grade Review</p>
        </div>
        <p style="color: #333333; font-size: 15px; line-height: 1.6;">Hello <strong>${data.studentName}</strong>,</p>
        <p style="color: #333333; font-size: 15px; line-height: 1.6;">Your instructor has personally reviewed your submission for <strong>${data.assignmentTitle}</strong> in <strong>${data.courseTitle}</strong> and updated your evaluation.</p>
        
        <div style="background-color: #fafafa; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e5e5;">
          <div style="display: inline-block; padding: 4px 12px; border-radius: 999px; background-color: #000000; color: #ffffff; font-size: 13px; font-weight: 800; margin-bottom: 12px;">
            Updated Score: ${data.newScore} / ${data.maxScore} (${percentage}%)
          </div>
          ${
            data.tutorFeedback
              ? `
            <h4 style="color: #784D28; font-size: 12px; text-transform: uppercase; margin: 12px 0 6px 0; letter-spacing: 0.5px;">Instructor's Personal Note:</h4>
            <p style="color: #222222; font-size: 13px; font-weight: 500; white-space: pre-wrap; line-height: 1.6; margin: 0; background-color: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #e5e5e5;">${data.tutorFeedback}</p>
          `
              : ""
          }
        </div>
        
        <p style="color: #777777; font-size: 13px;">View your updated academic record in your student portal.</p>
      </div>
    `,
  };
}

export function getAnnouncementEmailTemplate(data: AnnouncementEmailData): { subject: string; html: string } {
  return {
    subject: `Course Announcement: ${data.announcementTitle} [${data.courseTitle}]`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 16px; background-color: #ffffff; color: #000000;">
        <div style="border-bottom: 2px solid #000000; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #000000; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">ACADEMIA LMS</h1>
          <p style="color: #784D28; font-size: 12px; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase;">New Course Announcement</p>
        </div>
        <p style="color: #333333; font-size: 15px; line-height: 1.6;">Hello <strong>${data.studentName}</strong>,</p>
        <p style="color: #333333; font-size: 15px; line-height: 1.6;">An important announcement has just been posted for your course <strong>${data.courseTitle}</strong>:</p>
        
        <div style="background-color: #fafafa; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e5e5;">
          <h3 style="color: #000000; font-size: 16px; font-weight: 800; margin: 0 0 10px 0;">${data.announcementTitle}</h3>
          <p style="color: #333333; font-size: 14px; white-space: pre-wrap; line-height: 1.6; margin: 0;">${data.content}</p>
        </div>
        
        <p style="color: #777777; font-size: 13px;">Please log in to your course dashboard if you need to review materials or participate in class discussions.</p>
      </div>
    `,
  };
}

export function getCourseUpdateEmailTemplate(data: CourseUpdateEmailData): { subject: string; html: string } {
  return {
    subject: `Curriculum Update: ${data.courseTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 16px; background-color: #ffffff; color: #000000;">
        <div style="border-bottom: 2px solid #000000; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #000000; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">ACADEMIA LMS</h1>
          <p style="color: #784D28; font-size: 12px; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase;">Curriculum &amp; Materials Update</p>
        </div>
        <p style="color: #333333; font-size: 15px; line-height: 1.6;">Hello <strong>${data.studentName}</strong>,</p>
        <p style="color: #333333; font-size: 15px; line-height: 1.6;">Your instructor has updated the syllabus and learning materials for <strong>${data.courseTitle}</strong>.</p>
        
        <div style="background-color: #fafafa; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e5e5;">
          <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 0;">${data.updateSummary}</p>
        </div>
        
        <p style="color: #777777; font-size: 13px;">Access the course player now to review the latest lecture notes and resources.</p>
      </div>
    `,
  };
}

export function getCompletionEmailTemplate(data: CompletionEmailData): { subject: string; html: string } {
  return {
    subject: `Certificate Awarded: Completed ${data.courseTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 16px; background-color: #ffffff; color: #000000;">
        <div style="border-bottom: 2px solid #000000; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #000000; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">ACADEMIA LMS</h1>
          <p style="color: #784D28; font-size: 12px; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase;">Official Course Completion</p>
        </div>
        <p style="color: #333333; font-size: 15px; line-height: 1.6;">Hearty congratulations, <strong>${data.studentName}</strong>!</p>
        <p style="color: #333333; font-size: 15px; line-height: 1.6;">You have satisfied all academic requirements, passed all evaluations, and successfully completed <strong>${data.courseTitle}</strong>.</p>
        
        <div style="background-color: #fafafa; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e5e5; text-align: center;">
          <div style="font-size: 28px; margin-bottom: 8px;">🎓</div>
          <h3 style="color: #000000; font-size: 16px; font-weight: 800; margin: 0 0 6px 0;">Official Completion Certificate Ready</h3>
          ${data.certificateId ? `<p style="font-family: monospace; font-size: 12px; color: #784D28; font-weight: 700; margin: 0 0 10px 0;">Verification ID: ${data.certificateId}</p>` : ""}
          <p style="color: #555555; font-size: 13px; margin: 0;">Your single-course lock has now been released. You may print your official certificate directly from your student portal and register for your next course.</p>
        </div>
        
        <p style="color: #777777; font-size: 13px;">Best wishes in your continued academic excellence.</p>
      </div>
    `,
  };
}
