import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isR2Configured, getSignedModelUrl, SIGNED_URL_TTL_SECONDS } from "@/lib/r2";

// Returns a fetchable URL for a product's .glb model.
//
// - With R2 configured: a time-limited pre-signed GET URL, so the bucket can
//   stay private.
// - Without R2 (local fallback): the object key resolved under /public so the
//   demo still works with zero credentials.
//
// We look the key up from the DB by productId rather than trusting an arbitrary
// caller-supplied key — that prevents the route from being used to sign URLs
// for any object in the bucket.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");

  if (!productId) {
    return NextResponse.json(
      { error: "Missing productId" },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { modelUrl: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // modelUrl is stored as an R2 object key, e.g. "models/sofa.glb".
  const key = product.modelUrl.replace(/^\/+/, "");

  if (!isR2Configured) {
    // Local fallback: serve the file from /public by the same key.
    return NextResponse.json({
      url: `/${key}`,
      expiresIn: null,
      source: "local",
    });
  }

  try {
    const url = await getSignedModelUrl(key);
    const res = NextResponse.json({
      url,
      expiresIn: SIGNED_URL_TTL_SECONDS,
      source: "r2",
    });
    // Let the browser cache the signed URL response for most of its lifetime so
    // we don't re-sign on every view (re-sign before it expires).
    res.headers.set(
      "Cache-Control",
      `private, max-age=${Math.max(0, SIGNED_URL_TTL_SECONDS - 60)}`,
    );
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sign URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
