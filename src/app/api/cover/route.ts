import { NextResponse } from "next/server";
import { resolveStorageUrl, STORAGE_REF_PREFIX } from "@/lib/storage";

/**
 * Public course cover pictures. The storage bucket stays private, so a plain link to a stored cover would not
 * load; this hands the browser a short-lived signed link instead, which lets <img> tags on the catalog, landing
 * page and course pages work without any changes. Only files under covers/ can be fetched this way, so paid
 * lesson videos and files in the rest of the bucket are never exposed here.
 */
const COVER_KEY = /^covers\/[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_.-]{1,160}\.(jpg|png|webp)$/;

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key") || "";
  if (!COVER_KEY.test(key) || key.includes("..")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const signed = await resolveStorageUrl(`${STORAGE_REF_PREFIX}${key}`);
  if (!signed) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.redirect(signed, {
    status: 302,
    // the signed link lasts two hours; let browsers and the CDN reuse this redirect for 15 minutes
    headers: { "Cache-Control": "public, max-age=900" },
  });
}
