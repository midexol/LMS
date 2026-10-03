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

export interface CompletionEmailData {
  studentName: string;
  courseTitle: string;
}

export function getEnrollmentEmailTemplate(data: EnrollmentEmailData): { subject: string; html: string } {
  return {
    subject: `Enrollment Confirmed: ${data.courseTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
        <h2 style="color: #1e293b; margin-bottom: 12px;">Course Enrollment Confirmed</h2>
        <p style="color: #475569; font-size: 16px;">Hello ${data.studentName},</p>
        <p style="color: #475569; font-size: 16px;">You have successfully enrolled in <strong>${data.courseTitle}</strong>.</p>
        <div style="background-color: #ffffff; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #cbd5e1;">
          <p style="color: #334155; margin: 0; font-size: 14px;"><strong>Important Rule:</strong> You can only take one course at a time. Complete all modules and assignments in this course to register for another course.</p>
        </div>
        <p style="color: #64748b; font-size: 14px;">Log in to your dashboard to access your learning materials and assignments.</p>
      </div>
    `,
  };
}

export function getGradeEmailTemplate(data: GradeEmailData): { subject: string; html: string } {
  const percentage = Math.round((data.score / data.maxScore) * 100);
  return {
    subject: `Assignment Graded: ${data.assignmentTitle} (${data.score}/${data.maxScore})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
        <h2 style="color: #1e293b; margin-bottom: 12px;">Assignment Evaluation Complete</h2>
        <p style="color: #475569; font-size: 16px;">Hello ${data.studentName},</p>
        <p style="color: #475569; font-size: 16px;">Your submission for <strong>${data.assignmentTitle}</strong> in course <strong>${data.courseTitle}</strong> has been evaluated.</p>
        
        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #cbd5e1;">
          <h3 style="color: #784D28; margin-top: 0;">Score: ${data.score} / ${data.maxScore} (${percentage}%)</h3>
          <h4 style="color: #334155; margin-bottom: 8px;">Detailed Feedback:</h4>
          <p style="color: #475569; font-size: 15px; white-space: pre-wrap; line-height: 1.5;">${data.feedback}</p>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">Visit your course dashboard to view full submission history and continue your progress.</p>
      </div>
    `,
  };
}

export function getCompletionEmailTemplate(data: CompletionEmailData): { subject: string; html: string } {
  return {
    subject: `Congratulations: Completed ${data.courseTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
        <h2 style="color: #059669; margin-bottom: 12px;">Course Successfully Completed!</h2>
        <p style="color: #475569; font-size: 16px;">Hello ${data.studentName},</p>
        <p style="color: #475569; font-size: 16px;">You have finished all requirements for <strong>${data.courseTitle}</strong>.</p>
        
        <div style="background-color: #ecfdf5; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #a7f3d0;">
          <p style="color: #065f46; margin: 0; font-size: 15px;"><strong>Course Locked Released:</strong> You are now eligible to enroll and pay for a new course on the platform.</p>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">Browse the course catalog to choose your next learning journey.</p>
      </div>
    `,
  };
}
