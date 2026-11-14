import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const STORAGE_BUCKET = process.env.R2_BUCKET || "course-uploads";

let client: S3Client | null = null;

/**
 * Server-only Cloudflare R2 client (R2 speaks the S3 protocol). Never import this from client
 * components: the access keys can read, write and delete every file in the bucket.
 */
function getStorageClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("File storage is not configured: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required.");
  }
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // https://<account>.r2.cloudflarestorage.com/<bucket>/<key>, the form R2 documents
    forcePathStyle: true,
    // Do not add checksum headers to signed URLs: a browser upload cannot supply them and R2 rejects the request.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

export const STORAGE_REF_PREFIX = "storage:";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 2; // 2 hours
const UPLOAD_URL_TTL_SECONDS = 60 * 10; // 10 minutes

/**
 * Issues a one-time upload link for one object. The browser sends the file straight to R2 with a PUT,
 * because serverless hosts cap request bodies far below lesson video sizes. The link is only valid for
 * this exact object, content type and size, so it cannot be reused to store anything else.
 */
export async function createUploadUrl(objectPath: string, contentType: string, contentLength: number): Promise<string> {
  return getSignedUrl(
    getStorageClient(),
    new PutObjectCommand({ Bucket: STORAGE_BUCKET, Key: objectPath, ContentType: contentType, ContentLength: contentLength }),
    // signableHeaders makes the content type part of the signature, so only this exact type can be stored
    { expiresIn: UPLOAD_URL_TTL_SECONDS, signableHeaders: new Set(["content-type"]) }
  );
}

/**
 * Lesson media is stored as a private reference (`storage:<object path>`), never a public URL.
 * Call this on the server, only for users allowed to see the content, to get a short-lived link.
 * Plain URLs (for example YouTube embeds) pass through unchanged.
 */
export async function resolveStorageUrl(value: string | null | undefined): Promise<string> {
  if (!value) return "";
  if (!value.startsWith(STORAGE_REF_PREFIX)) return value;

  const objectPath = value.slice(STORAGE_REF_PREFIX.length);
  try {
    return await getSignedUrl(
      getStorageClient(),
      new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: objectPath }),
      { expiresIn: SIGNED_URL_TTL_SECONDS }
    );
  } catch (error) {
    console.error("[STORAGE] Failed to sign URL for", objectPath, error);
    return "";
  }
}
