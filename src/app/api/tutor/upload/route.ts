import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";

// Allowed MIME types and their extensions
const ALLOWED: Record<string, string> = {
  "application/pdf":       ".pdf",
  "video/mp4":             ".mp4",
  "video/webm":            ".webm",
  "video/ogg":             ".ogv",
  "image/jpeg":            ".jpg",
  "image/png":             ".png",
  "image/webp":            ".webp",
  "application/zip":       ".zip",
  "application/msword":    ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain":            ".txt",
};

const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "TUTOR" && currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 100 MB limit." }, { status: 413 });
    }

    const ext = ALLOWED[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed.` },
        { status: 415 }
      );
    }

    // Strip client extension and build a safe, unique filename ending in verified ext
    const parsed = path.parse(file.name);
    const safeBase = (parsed.name || "upload")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_{2,}/g, "_")
      .slice(0, 50);

    const timestamp = Date.now();
    const filename = `${timestamp}_${safeBase}${ext}`;

    // Save to public/uploads (served statically)
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(uploadsDir, filename), buffer);

    const publicUrl = `/uploads/${filename}`;
    return NextResponse.json({ success: true, url: publicUrl, name: file.name });
  } catch (err: any) {
    console.error("[UPLOAD ERROR]", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
