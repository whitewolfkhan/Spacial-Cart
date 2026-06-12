import "server-only";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 is S3-compatible, so we use the AWS S3 SDK pointed at the
// account's R2 endpoint. All access goes through time-limited pre-signed GET
// URLs, so the bucket itself can stay fully private.

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;

/** True only when every R2 credential is present. */
export const isR2Configured = Boolean(
  accountId && accessKeyId && secretAccessKey && bucket,
);

/** How long a signed GET URL stays valid (seconds). */
export const SIGNED_URL_TTL_SECONDS = Number(
  process.env.R2_SIGNED_URL_TTL ?? 60 * 60, // 1 hour default
);

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      // R2 ignores region but the SDK requires one; "auto" is conventional.
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });
  }
  return client;
}

/** Object-key prefix and content type for .glb models. */
export const MODELS_PREFIX = "models/";
export const GLB_CONTENT_TYPE = "model/gltf-binary";
export const GLB_CACHE_CONTROL = "public, max-age=31536000, immutable";

/** Local fallback directory (served from /public/models) when R2 is unset. */
const LOCAL_MODELS_DIR = path.join(process.cwd(), "public", MODELS_PREFIX);

/**
 * Generate a pre-signed GET URL for an R2 object key (e.g. "models/sofa.glb").
 * Throws if R2 isn't configured — callers should check `isR2Configured` first
 * and use a fallback.
 */
export async function getSignedModelUrl(key: string): Promise<string> {
  if (!isR2Configured) {
    throw new Error("R2 is not configured");
  }
  const command = new GetObjectCommand({ Bucket: bucket!, Key: key });
  return getSignedUrl(getClient(), command, {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}

/**
 * Upload a .glb model. Writes to R2 when configured, otherwise to
 * public/models/ so the demo works with no credentials. Returns the object key
 * (e.g. "models/sofa.glb") to store in the DB.
 */
export async function uploadModel(
  key: string,
  body: Buffer,
  contentType = GLB_CONTENT_TYPE,
): Promise<string> {
  if (isR2Configured) {
    await getClient().send(
      new PutObjectCommand({
        Bucket: bucket!,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: GLB_CACHE_CONTROL,
      }),
    );
    return key;
  }

  // Local fallback: write under public/ at the same key.
  const filename = key.slice(MODELS_PREFIX.length);
  await mkdir(LOCAL_MODELS_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_MODELS_DIR, filename), body);
  return key;
}

/**
 * Delete a model object by key from R2 (or the local fallback file). Best
 * effort: never throws, so a failed asset cleanup can't block deleting the DB
 * row. Returns true if the delete was attempted without error.
 */
export async function deleteModel(key: string): Promise<boolean> {
  try {
    if (isR2Configured) {
      await getClient().send(
        new DeleteObjectCommand({ Bucket: bucket!, Key: key }),
      );
      return true;
    }
    const filename = key.slice(MODELS_PREFIX.length);
    await unlink(path.join(LOCAL_MODELS_DIR, filename)).catch(() => {});
    return true;
  } catch {
    return false;
  }
}
