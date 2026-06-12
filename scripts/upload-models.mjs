/**
 * Uploads the local .glb models in public/models/ to the Cloudflare R2 bucket
 * under the `models/` prefix, with the correct Content-Type and long-lived
 * immutable caching headers.
 *
 * Run: npm run upload:models
 *
 * Requires the same R2_* env vars the app uses (see .env / .env.example):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *
 * The DB stores object keys like "models/sofa.glb" (see prisma/seed.ts), so we
 * upload to that exact key. Re-running is safe — it overwrites in place.
 */
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const modelsDir = join(__dirname, "..", "public", "models");

// Match the .glb content type and caching used elsewhere in the app.
const CONTENT_TYPE = "model/gltf-binary";
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const KEY_PREFIX = "models/";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
  process.env;

function requireEnv() {
  const missing = [
    ["R2_ACCOUNT_ID", R2_ACCOUNT_ID],
    ["R2_ACCESS_KEY_ID", R2_ACCESS_KEY_ID],
    ["R2_SECRET_ACCESS_KEY", R2_SECRET_ACCESS_KEY],
    ["R2_BUCKET", R2_BUCKET],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    console.error(
      `Missing R2 env var(s): ${missing.join(", ")}.\n` +
        "Set them in .env (see .env.example) before uploading.",
    );
    process.exit(1);
  }
}

async function main() {
  requireEnv();

  const client = new S3Client({
    // R2 ignores region but the SDK requires one; "auto" is conventional.
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  // Fail fast with a clear message if creds/bucket are wrong.
  try {
    await client.send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
  } catch (err) {
    console.error(
      `Could not access bucket "${R2_BUCKET}": ${err?.message ?? err}\n` +
        "Check the bucket name and that the API token has access.",
    );
    process.exit(1);
  }

  const entries = await readdir(modelsDir);
  const glbFiles = entries.filter((f) => f.toLowerCase().endsWith(".glb"));

  if (glbFiles.length === 0) {
    console.error(
      `No .glb files found in ${modelsDir}. Run "node scripts/generate-models.mjs" first.`,
    );
    process.exit(1);
  }

  console.log(
    `Uploading ${glbFiles.length} model(s) to r2://${R2_BUCKET}/${KEY_PREFIX}\n`,
  );

  for (const file of glbFiles) {
    const key = KEY_PREFIX + basename(file);
    const body = await readFile(join(modelsDir, file));

    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: CONTENT_TYPE,
        CacheControl: CACHE_CONTROL,
      }),
    );

    console.log(`  ✓ ${key}  (${body.length} bytes)`);
  }

  console.log("\nDone. Models are live in R2.");
}

main().catch((err) => {
  console.error("\nUpload failed:", err?.message ?? err);
  process.exit(1);
});
