/**
 * Creates (or promotes) a single ADMIN account. Credentials come from the environment so no
 * password is ever stored in the repo:
 *
 *   ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a long unique password" ADMIN_NAME="Your Name" \
 *     npx tsx prisma/create-admin.ts
 *
 * If the email already exists, that user is promoted to ADMIN and their password is reset.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administrator";

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set.");
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      name,
      email,
      password: hashed,
      role: "ADMIN",
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      password: hashed,
      role: "ADMIN",
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Admin ready: ${user.email} (role: ${user.role})`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
