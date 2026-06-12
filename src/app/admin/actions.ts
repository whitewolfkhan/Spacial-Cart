"use server";

import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadModel, deleteModel, MODELS_PREFIX } from "@/lib/r2";
import { compressGlb } from "@/lib/compress-glb";

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

/** Turn a product name into a URL/key-safe slug. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function parsePositiveFloat(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Create a product: stream the uploaded .glb to R2 (or local fallback), then
 * write the row to Postgres and revalidate the storefront.
 */
export async function createProduct(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const accent = String(formData.get("accent") ?? "#6d5efc").trim();

  const priceDollars = parsePositiveFloat(formData.get("price"));
  const length = parsePositiveFloat(formData.get("length"));
  const width = parsePositiveFloat(formData.get("width"));
  const height = parsePositiveFloat(formData.get("height"));
  const file = formData.get("model");

  // --- validate ---
  if (!name) return { ok: false, error: "Name is required." };
  if (!description) return { ok: false, error: "Description is required." };
  if (priceDollars === null) return { ok: false, error: "Price must be a positive number." };
  if (length === null || width === null || height === null) {
    return { ok: false, error: "All dimensions must be positive numbers." };
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(accent)) {
    return { ok: false, error: "Accent must be a hex color like #6d5efc." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "A .glb model file is required." };
  }
  if (!file.name.toLowerCase().endsWith(".glb")) {
    return { ok: false, error: "Model must be a .glb file." };
  }

  // Unique, key-safe id. Append a short suffix if the slug is taken.
  const base = slugify(name) || "product";
  let id = base;
  for (let i = 2; await prisma.product.findUnique({ where: { id }, select: { id: true } }); i++) {
    id = `${base}-${i}`;
  }

  const key = `${MODELS_PREFIX}${id}.glb`;
  const original = Buffer.from(await file.arrayBuffer());

  // Compress the .glb (Draco + texture dedup) via temp files, then upload the
  // optimized result. Temp files are always cleaned up.
  let tmpRoot: string | null = null;
  try {
    tmpRoot = await mkdtemp(path.join(tmpdir(), "spatialcart-glb-"));
    const rawPath = path.join(tmpRoot, "original.glb");
    const optimizedPath = path.join(tmpRoot, "optimized.glb");

    await writeFile(rawPath, original);

    let optimized: Buffer;
    try {
      const compressed = await compressGlb(await readFile(rawPath));
      await writeFile(optimizedPath, compressed);
      optimized = Buffer.from(await readFile(optimizedPath));
    } catch (err) {
      // If compression fails (e.g. an exotic .glb), fall back to the original
      // so the merchant isn't blocked.
      console.error("[createProduct] compression failed, using original:", err);
      optimized = original;
    }

    await uploadModel(key, optimized);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return { ok: false, error: `Failed to upload model: ${message}` };
  } finally {
    if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true });
  }

  try {
    await prisma.product.create({
      data: {
        id,
        name,
        description,
        priceCents: Math.round(priceDollars * 100),
        length,
        width,
        height,
        modelUrl: key,
        accent,
      },
    });
  } catch (err) {
    // Roll back the uploaded asset so we don't leave an orphan.
    await deleteModel(key);
    const message = err instanceof Error ? err.message : "Database error";
    return { ok: false, error: `Failed to save product: ${message}` };
  }

  // New product should appear on the storefront immediately.
  revalidatePath("/");
  revalidatePath("/admin/products");

  return { ok: true, id };
}

/** Delete a product row and best-effort remove its model asset. */
export async function deleteProduct(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const product = await prisma.product.findUnique({
    where: { id },
    select: { modelUrl: true },
  });
  if (!product) return;

  await prisma.product.delete({ where: { id } });
  // Best-effort asset cleanup; never blocks the row delete.
  await deleteModel(product.modelUrl);

  revalidatePath("/");
  revalidatePath("/admin/products");
}
