import { NextRequest, NextResponse } from "next/server";
import path from "path";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { getStorageAdmin, STORAGE_BUCKET } from "@/lib/storage";

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

/**
 * Issues a one-time signed upload URL. The browser uploads the file directly to Supabase Storage,
 * because serverless hosts cap request bodies (4.5 MB on Vercel) far below lesson video sizes.
 * The bucket's own size and MIME limits must mirror MAX_SIZE/ALLOWED, since the direct upload
 * bypasses this route.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "TUTOR" && currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const { fileName, fileType, fileSize } = await req.json();

    if (typeof fileName !== "string" || !fileName) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (typeof fileSize !== "number" || fileSize > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 100 MB limit." }, { status: 413 });
    }

    const ext = ALLOWED[fileType];
    if (!ext) {
      return NextResponse.json(
        { error: `File type "${fileType}" is not allowed.` },
        { status: 415 }
      );
    }

    // Strip client extension and build a safe, unique object path ending in verified ext
    const parsed = path.parse(fileName);
    const safeBase = (parsed.name || "upload")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_{2,}/g, "_")
      .slice(0, 50);

    const objectPath = `${currentUser.id}/${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${safeBase}${ext}`;

    const storage = getStorageAdmin().storage.from(STORAGE_BUCKET);
    const { data, error } = await storage.createSignedUploadUrl(objectPath);
    if (error || !data) {
      throw error || new Error("Failed to create signed upload URL.");
    }

    const { data: publicData } = storage.getPublicUrl(objectPath);

    return NextResponse.json({
      success: true,
      bucket: STORAGE_BUCKET,
      path: data.path,
      token: data.token,
      contentType: fileType,
      url: publicData.publicUrl,
      name: fileName,
    });
  } catch (err: any) {
    console.error("[UPLOAD ERROR]", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
