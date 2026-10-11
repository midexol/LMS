import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // This script DELETES every user, course and payment, then creates demo accounts that all share the
  // password "password123". It must never run against a real database by accident.
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_SEED !== "yes") {
    console.error(
      "Refusing to seed: this wipes all data and creates demo accounts with a known password.\n" +
        "Only for a throwaway local database: run with ALLOW_DEMO_SEED=yes (never in production).\n" +
        "To create your first real admin use: npm run db:create-admin"
    );
    process.exit(1);
  }

  console.log("Seeding database...");

  // Clear existing data in dependency order
  await prisma.discussionReply.deleteMany();
  await prisma.discussionPost.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("password123", 12);

  // Create Users
  const student = await prisma.user.create({
    data: {
      name: "Alex Rivera",
      email: "alex@student.com",
      password,
      role: "STUDENT",
    },
  });

  const tutor = await prisma.user.create({
    data: {
      name: "Dr. Marcus Vance",
      email: "marcus@tutor.com",
      password,
      role: "TUTOR",
    },
  });

  await prisma.user.create({
    data: {
      name: "Platform Admin",
      email: "admin@lms.com",
      password,
      role: "ADMIN",
    },
  });

  console.log("Created users.");

  // Create Course 1
  const course1 = await prisma.course.create({
    data: {
      title: "Advanced Next.js and Full-Stack Architecture",
      description:
        "A comprehensive deep-dive into building production-grade applications with Next.js 14 App Router, TypeScript, Prisma ORM, and serverless API design. Learn advanced patterns used at scale.",
      category: "Software Engineering",
      level: "Advanced",
      price: 149.99,
      published: true,
      tutorId: tutor.id,
      modules: {
        create: [
          {
            title: "Module 1: App Router and Server Components",
            order: 1,
            lessons: {
              create: [
                {
                  title: "Lesson 1: Next.js 14 App Router Deep Dive",
                  content:
                    "The App Router introduces React Server Components as the default. Understand how layouts, pages, and loading states work together, and how server-side data fetching eliminates the need for useEffect in many cases.",
                  videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                  order: 1,
                  assignments: {
                    create: [
                      {
                        title: "Assignment: App Router Architecture",
                        prompt:
                          "Explain the difference between Server Components and Client Components in Next.js 14. When should you use each?",
                        referenceAnswer:
                          "Server Components run on the server, have no client-side JS, can directly access databases, and reduce bundle size. Client Components run in the browser, handle interactivity, and use useState/useEffect. Use Server Components for data fetching and static rendering; use Client Components for forms, event handlers, and browser APIs.",
                        maxScore: 100,
                      },
                    ],
                  },
                },
                {
                  title: "Lesson 2: Data Fetching Patterns",
                  content:
                    "Explore parallel fetching, sequential fetching, streaming with Suspense, and the new fetch caching semantics in Next.js 14.",
                  videoUrl: "",
                  order: 2,
                  assignments: {
                    create: [
                      {
                        title: "Assignment: Fetching Strategies",
                        prompt:
                          "Compare parallel vs sequential data fetching. Provide a code example for each and explain the trade-offs.",
                        referenceAnswer:
                          "Parallel: use Promise.all([fetch(a), fetch(b)]) to reduce total wait time. Sequential: await fetch(a) then await fetch(b) when the second depends on the first. Parallel is faster when requests are independent; sequential is required when there are data dependencies.",
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            title: "Module 2: Database Design with Prisma",
            order: 2,
            lessons: {
              create: [
                {
                  title: "Lesson 3: Prisma Schema and Relations",
                  content:
                    "Design robust relational schemas using Prisma's schema language. Cover one-to-many, many-to-many relations, cascading deletes, and unique constraints.",
                  videoUrl: "",
                  order: 1,
                  assignments: {
                    create: [
                      {
                        title: "Assignment: Schema Design",
                        prompt:
                          "Design a Prisma schema for a blog platform with Users, Posts, Comments, and Tags with many-to-many.",
                        referenceAnswer:
                          "Schema should include User (id, name, email), Post (id, title, content, authorId → User), Comment (id, content, postId → Post, authorId → User), Tag (id, name), and a PostTag join table. Relations should use onDelete: Cascade where appropriate.",
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Create Course 2
  const course2 = await prisma.course.create({
    data: {
      title: "Python for Data Science and Machine Learning",
      description:
        "From NumPy and Pandas fundamentals to building and deploying ML models with scikit-learn and TensorFlow. Hands-on projects throughout. No prior ML experience required.",
      category: "Data Science & AI",
      level: "Intermediate",
      price: 119.99,
      published: true,
      tutorId: tutor.id,
      modules: {
        create: [
          {
            title: "Module 1: Data Manipulation with Pandas",
            order: 1,
            lessons: {
              create: [
                {
                  title: "Lesson 1: DataFrames and Series",
                  content:
                    "Learn to load, inspect, clean, and transform data using Pandas. Covers indexing, filtering, groupby, and merging datasets.",
                  videoUrl: "",
                  order: 1,
                  assignments: {
                    create: [
                      {
                        title: "Assignment: Data Cleaning",
                        prompt:
                          "Given a dataset with missing values and duplicates, describe the Pandas methods you would use to clean it and explain each step.",
                        referenceAnswer:
                          "Use df.isnull().sum() to identify missing values, df.dropna() or df.fillna() to handle them, df.duplicated() to find duplicates, df.drop_duplicates() to remove them. Then df.dtypes to check types and df.astype() to convert where needed.",
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Create Course 3
  await prisma.course.create({
    data: {
      title: "UI/UX Design Fundamentals",
      description:
        "Learn the principles of great user interface and experience design. Cover typography, color theory, layout grids, Figma workflows, and usability testing methodologies.",
      category: "Design & UX",
      level: "Beginner",
      price: 89.99,
      published: true,
      tutorId: tutor.id,
      modules: {
        create: [
          {
            title: "Module 1: Design Principles",
            order: 1,
            lessons: {
              create: [
                {
                  title: "Lesson 1: Visual Hierarchy and Layout",
                  content:
                    "Understand how users scan and read interfaces. Learn to use size, weight, color, and spacing to guide user attention.",
                  videoUrl: "",
                  order: 1,
                  assignments: {
                    create: [
                      {
                        title: "Assignment: Visual Hierarchy",
                        prompt:
                          "Explain the 5 key principles of visual hierarchy in UI design and how each one influences user behavior.",
                        referenceAnswer:
                          "Size (larger = more important), Color (contrast draws attention), Typography (weight and style create hierarchy), Spacing (white space separates and groups), Position (top-left reads first in LTR layouts). Together they guide the user's eye through the interface in the intended order.",
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Enroll student in course1
  await prisma.enrollment.create({
    data: {
      studentId: student.id,
      courseId: course1.id,
      status: "ACTIVE",
    },
  });

  // Post an announcement on course1
  await prisma.announcement.create({
    data: {
      courseId: course1.id,
      title: "Welcome to Advanced Next.js!",
      content:
        "Welcome to the course. Please ensure you have Node.js 18+ installed. All assignments are auto-graded by AI with the option for tutor review. Good luck!",
    },
  });

  console.log("Seeding complete.");
  console.log("Demo credentials (password: password123):");
  console.log("  Student:  alex@student.com");
  console.log("  Tutor:    marcus@tutor.com");
  console.log("  Admin:    admin@lms.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
